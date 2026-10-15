/// <reference path="../pb_types.d.ts" />

// Atrium chatroom — initial schema.
//
// Creates: presences, channels, channel_members, messages
// Extends: the default "users" auth collection with profile fields.
//
// Ordering note: `channels` rules reference `@collection.channel_members`,
// but `channel_members` needs `channels` to exist for its relation field.
// So we create `channels` with placeholder rules first, create
// `channel_members`, then upgrade `channels` to the real rules.
//
// Uniqueness note: PocketBase enforces uniqueness via SQLite unique
// indexes (not per-field flags). We use that to guarantee one presence
// per user and one membership row per (channel, user) pair.

migrate((app) => {
    const hasField = (collection, name) => {
        try {
            collection.fields.getByName(name)
            return true
        } catch (e) {
            return false
        }
    }

    // --------------------------------------------------------------
    // 0. Clean up any partial state so retries are safe.
    //    (Initial setup only — there is no data to preserve yet.)
    // --------------------------------------------------------------
    for (const name of ["presences", "messages", "channel_members", "channels"]) {
        try {
            app.delete(app.findCollectionByNameOrId(name))
        } catch (e) {
            // doesn't exist — ignore
        }
    }

    // --------------------------------------------------------------
    // 1. Extend the default "users" auth collection
    //    (`name` and `avatar` already exist on the default collection.)
    // --------------------------------------------------------------
    let users = app.findCollectionByNameOrId("users")

    if (!hasField(users, "name")) {
        users.fields.add(new TextField({ name: "name", max: 60 }))
    }
    users.fields.getByName("name").required = true

    if (!hasField(users, "avatar")) {
        users.fields.add(new FileField({ name: "avatar", maxSelect: 1 }))
    }
    if (!hasField(users, "title")) {
        users.fields.add(new TextField({ name: "title", max: 80 }))
    }
    if (!hasField(users, "timezone")) {
        users.fields.add(new TextField({ name: "timezone", max: 60 }))
    }

    // Signed-in users can read profiles (needed to render member lists).
    // A user may edit only their own record. Open self-registration for
    // the team; tighten later if needed.
    users.listRule   = "@request.auth.id != ''"
    users.viewRule   = "@request.auth.id != ''"
    users.createRule = ""
    users.updateRule = "@request.auth.id = id"
    users.deleteRule = null // superuser only

    app.save(users)

    // --------------------------------------------------------------
    // 2. channels — created with PLACEHOLDER rules for now.
    // --------------------------------------------------------------
    let channels = new Collection({
        type: "base",
        name: "channels",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
            { name: "name",        type: "text", max: 60 },
            { name: "description", type: "text", max: 255 },
            { name: "type",        type: "select", values: ["public", "private", "dm"], required: true, maxSelect: 1 },
            { name: "last_message_at", type: "date" },
            { name: "created_by",  type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
        ],
        indexes: [
            "CREATE INDEX idx_channels_type ON channels (type)",
        ],
    })
    app.save(channels)

    // --------------------------------------------------------------
    // 3. channel_members — join table holding per-user role + read state
    // --------------------------------------------------------------
    let members = new Collection({
        type: "base",
        name: "channel_members",
        // Simple, safe starting point: any signed-in user can read
        // membership rows. To make memberships private, swap in the
        // self-join rule:
        //   "@collection.channel_members:auth.user ?= @request.auth.id
        //    && @collection.channel_members.channel ?= @collection.channel_members:auth.channel"
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        // Relaxed on purpose so a user can add themselves when joining a
        // public channel and can seed both rows when opening a DM.
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "channel",  type: "relation", required: true, maxSelect: 1, collectionId: channels.id, cascadeDelete: true },
            { name: "user",     type: "relation", required: true, maxSelect: 1, collectionId: users.id,    cascadeDelete: true },
            { name: "role",     type: "select", values: ["owner", "admin", "member"], required: true, maxSelect: 1 },
            { name: "last_read", type: "date" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_channel_members_channel_user ON channel_members (channel, user)",
            "CREATE INDEX idx_channel_members_user ON channel_members (user)",
        ],
    })
    app.save(members)

    // --------------------------------------------------------------
    // 4. Upgrade `channels` to the real cross-collection rules now
    //    that `channel_members` exists.
    // --------------------------------------------------------------
    channels = app.findCollectionByNameOrId("channels")
    // Public channels are visible to any signed-in user; private
    // channels and DMs are visible only to their members.
    channels.listRule   = "type = 'public' || (@collection.channel_members.channel ?= id && @collection.channel_members.user ?= @request.auth.id)"
    channels.viewRule   = "type = 'public' || (@collection.channel_members.channel ?= id && @collection.channel_members.user ?= @request.auth.id)"
    channels.updateRule = "@collection.channel_members.channel ?= id && @collection.channel_members.user ?= @request.auth.id && (@collection.channel_members.role ?= 'owner' || @collection.channel_members.role ?= 'admin')"
    channels.deleteRule = "@collection.channel_members.channel ?= id && @collection.channel_members.user ?= @request.auth.id && @collection.channel_members.role ?= 'owner'"
    app.save(channels)

    // --------------------------------------------------------------
    // 5. messages
    // --------------------------------------------------------------
    let messages = new Collection({
        type: "base",
        name: "messages",
        // Only members of a channel can read its messages.
        listRule:   "@collection.channel_members.channel ?= channel && @collection.channel_members.user ?= @request.auth.id",
        viewRule:   "@collection.channel_members.channel ?= channel && @collection.channel_members.user ?= @request.auth.id",
        createRule: "@collection.channel_members.channel ?= channel && @collection.channel_members.user ?= @request.auth.id && author = @request.auth.id",
        updateRule: "author = @request.auth.id",
        deleteRule: "author = @request.auth.id",
        fields: [
            { name: "channel", type: "relation", required: true, maxSelect: 1, collectionId: channels.id, cascadeDelete: true },
            { name: "author",  type: "relation", required: true, maxSelect: 1, collectionId: users.id,    cascadeDelete: true },
            { name: "text",    type: "text", max: 4000 },
            { name: "attachments", type: "file", maxSelect: 5, maxSize: 10485760 },
        ],
    })
    app.save(messages)

    // Self-referencing `parent` field powers threads. It has to be added
    // after the messages collection exists so it can point at itself.
    messages.fields.add(new RelationField({
        name: "parent",
        maxSelect: 1,
        collectionId: messages.id,
        cascadeDelete: true,
    }))

    // Indexes are added after the initial save. Note: we index on real
    // fields only — PocketBase adds system columns (id/created/updated)
    // outside the migration's index step, so `created` isn't indexable
    // from here. Sorting by `created` still works fine at runtime.
    messages.addIndex("idx_messages_parent", false, "parent", "")
    messages.addIndex("idx_messages_channel", false, "channel", "")
    app.save(messages)

    // --------------------------------------------------------------
    // 6. presences — volatile presence, kept off `users` on purpose
    // --------------------------------------------------------------
    let presences = new Collection({
        type: "base",
        name: "presences",
        listRule:   "@request.auth.id != ''",
        viewRule:   "@request.auth.id != ''",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "user",   type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
            { name: "state",  type: "select", values: ["online", "away", "dnd", "invisible"], required: true, maxSelect: 1 },
            { name: "status_text", type: "text", max: 120 },
            { name: "last_seen",   type: "date" },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_presences_user ON presences (user)",
        ],
    })
    app.save(presences)
}, (app) => {
    // Revert: drop the collections we created. The `users` extension is
    // intentionally left in place.
    for (const name of ["presences", "messages", "channel_members", "channels"]) {
        try {
            app.delete(app.findCollectionByNameOrId(name))
        } catch (e) {
            // already gone — ignore
        }
    }
})
