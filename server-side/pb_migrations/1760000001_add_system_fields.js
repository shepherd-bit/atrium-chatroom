/// <reference path="../pb_types.d.ts" />

// Atrium — schema repair: system fields the initial migration never created.
//
// Two assumptions in 1760000000_create_atrium_collections.js don't hold on
// PocketBase 0.40:
//
//   1. Base collections created from a migration do NOT get `created` /
//      `updated` unless they are declared. Without them every `sort=created`
//      query 400s ("Something went wrong while processing your request."),
//      message history can't be ordered or paged, and `record.created` comes
//      back undefined (the client mapper falls back to "now").
//
//   2. `fields.getByName(name)` returns nil for a missing field instead of
//      throwing, so the `hasField()` guard in the initial migration always
//      answered "yes" and the `title` / `timezone` profile fields were never
//      added to `users`.
//
// This migration adds both. Every addition is guarded, so it is a no-op on
// databases where the fields already exist. Existing rows keep empty values;
// every record created from now on is stamped automatically.
//
// Applied automatically the next time PocketBase starts (`pb_migrations`
// sits next to `pb_data`, which is the default migrations location).

migrate((app) => {
    // --------------------------------------------------------------
    // 1. users — the profile fields the initial migration skipped.
    //    (`title` feeds UI roles, `timezone` the "local time" line.)
    // --------------------------------------------------------------
    const users = app.findCollectionByNameOrId("users")

    if (!users.fields.getByName("title")) {
        users.fields.add(new TextField({ name: "title", max: 80 }))
    }
    if (!users.fields.getByName("timezone")) {
        users.fields.add(new TextField({ name: "timezone", max: 60 }))
    }

    app.save(users)

    // --------------------------------------------------------------
    // 2. Base collections — `created` / `updated` as autodate fields.
    //    `created` is stamped on insert only, `updated` on insert + update.
    // --------------------------------------------------------------
    for (const name of ["channels", "channel_members", "messages", "presences"]) {
        const collection = app.findCollectionByNameOrId(name)

        if (!collection.fields.getByName("created")) {
            collection.fields.add(new AutodateField({ name: "created", onCreate: true, onUpdate: false }))
        }
        if (!collection.fields.getByName("updated")) {
            collection.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }))
        }

        app.save(collection)
    }
}, (app) => {
    const users = app.findCollectionByNameOrId("users")
    for (const name of ["title", "timezone"]) {
        if (users.fields.getByName(name)) users.fields.remove(name)
    }
    app.save(users)

    for (const name of ["channels", "channel_members", "messages", "presences"]) {
        const collection = app.findCollectionByNameOrId(name)
        for (const field of ["created", "updated"]) {
            if (collection.fields.getByName(field)) collection.fields.remove(field)
        }
        app.save(collection)
    }
})
