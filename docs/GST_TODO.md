# GST TODO

## Credit Notes

- Add an admin `Credit Note` action from each GST invoice row.
- Open a credit note dialog with invoice details, selectable invoice items, required reason, and optional refund reference.
- Create credit notes for full invoice items first; defer partial quantity or partial amount credit notes until tax recalculation rules are finalized.
- Add a Credit Notes tab under GST to list issued credit notes.
- Add credit note PDF download using a layout similar to the tax invoice, titled `Credit Note`.
- Include credit notes in GST exports as negative adjustment rows linked to the original invoice.

## Invoice Email

- Backend email service integration is implemented for generated invoice PDFs.
- Admin invoice preview action `Send invoice to customer email` is enabled.
- Configure ZeptoMail production env and test delivery with a real verified sender before launch.
