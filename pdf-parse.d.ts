declare module "pdf-parse" {
  type PDFInfo = {
    numpages: number
    numrender: number
    info: any
    metadata: any
    version: string
  }

  type PDFData = {
    text: string
    info: any
    metadata: any
    version: string
    numpages: number
  }

  function pdfParse(data: Buffer | Uint8Array): Promise<PDFData>

  export default pdfParse
}
