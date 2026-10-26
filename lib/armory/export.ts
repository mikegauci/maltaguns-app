// The XLS side of import/export: builds a workbook of a shipment's (or the
// whole inventory's) items using the same column names the importer already
// recognises, so a dealer can export, edit in Excel/Sheets, and re-import.
import ExcelJS from 'exceljs'
import type { ItemRow } from './types'

type ExportKey = keyof ItemRow | 'buyer' | 'shipment'

const COLUMNS: { header: string; key: ExportKey; width?: number }[] = [
  { header: 'Item type', key: 'itemType', width: 14 },
  { header: 'Category', key: 'category', width: 12 },
  { header: 'Make', key: 'make', width: 16 },
  { header: 'Model', key: 'model', width: 16 },
  { header: 'Serial number', key: 'serialNumber', width: 16 },
  { header: 'Calibre', key: 'calibreDisplay', width: 14 },
  { header: 'Country of manufacture', key: 'countryOfManufacture', width: 14 },
  { header: 'Year of manufacture', key: 'yearOfManufacture', width: 10 },
  { header: 'Quantity', key: 'quantity', width: 8 },
  { header: 'CIP proof', key: 'cipProof', width: 10 },
  { header: 'Purchase price', key: 'acquisitionPrice', width: 12 },
  { header: 'eGun shipping fee', key: 'egunDomesticShippingFee', width: 12 },
  { header: 'Sale price', key: 'salePrice', width: 12 },
  { header: 'Handling fee', key: 'clientHandlingFee', width: 12 },
  { header: 'Original seller', key: 'originalSeller', width: 16 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Buyer', key: 'buyer', width: 18 },
  { header: 'Shipment', key: 'shipment', width: 14 },
  { header: 'Notes', key: 'notes', width: 24 },
]

export async function buildItemsWorkbook(
  items: ItemRow[],
  sheetName = 'Items'
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MaltaGuns Armory'
  const sheet = wb.addWorksheet(sheetName.slice(0, 31) || 'Items')
  sheet.columns = COLUMNS.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 14,
  }))
  sheet.getRow(1).font = { bold: true }

  for (const i of items) {
    sheet.addRow({
      itemType: i.itemType,
      category: i.category ?? i.typeDescription ?? '',
      make: i.make ?? '',
      model: i.model ?? '',
      serialNumber: i.serialNumber ?? '',
      calibreDisplay: i.calibreDisplay ?? i.calibreRaw ?? '',
      countryOfManufacture: i.countryOfManufacture ?? '',
      yearOfManufacture: i.yearOfManufacture ?? '',
      quantity: i.quantity,
      cipProof: i.cipProof === true ? 'Yes' : i.cipProof === false ? 'No' : '',
      acquisitionPrice: i.acquisitionPrice ?? '',
      egunDomesticShippingFee: i.egunDomesticShippingFee ?? '',
      salePrice: i.salePrice ?? '',
      clientHandlingFee: i.clientHandlingFee ?? '',
      originalSeller: i.originalSeller ?? '',
      status: i.status,
      buyer: i.buyerName ?? '',
      shipment: i.shipmentReference ?? '',
      notes: i.notes ?? '',
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
