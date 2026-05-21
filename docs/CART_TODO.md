# Cart TODO

## Pending Work

- Implement automatic cart status updates.
- Keep new and currently editable carts as `active`.
- Mark a cart as `converted` after successful checkout or order creation.
- Mark a cart as `abandoned` after a defined inactivity window, for example 7 or 14 days without updates.
- Decide whether abandoned-cart detection should run through a scheduled job, cron task, or background queue.
- Add tests for cart status transitions once order checkout is implemented.

## Current Behavior

- Cart status is saved on the `carts.status` field.
- New carts are created as `active`.
- Admin cart filtering already supports `active`, `converted`, and `abandoned`.
- `converted` and `abandoned` statuses are not automated yet.
