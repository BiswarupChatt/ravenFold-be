# GST TODO

## Credit Notes

- Add an admin `Credit Note` action from each GST invoice row.
- Open a credit note dialog with invoice details, selectable invoice items, required reason, and optional refund reference.
- Create credit notes for full invoice items first; defer partial quantity or partial amount credit notes until tax recalculation rules are finalized.
- Add a Credit Notes tab under GST to list issued credit notes.
- Add credit note PDF download using a layout similar to the tax invoice, titled `Credit Note`.
- Include credit notes in GST exports as negative adjustment rows linked to the original invoice.

## Invoice Email

- Add backend email service integration for sending generated invoice PDFs to the customer email address.
- Enable the admin invoice preview action `Send invoice to customer email` after the email server is implemented.
