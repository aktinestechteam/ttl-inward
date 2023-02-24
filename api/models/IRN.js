/**
 * IRN.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
        invoice_number:                 {type: 'string', required: true},
        type_of_invoice:                {type: 'string', required: true, isIn: [sails.config.custom.irn_invoice_types.invoice, sails.config.custom.irn_invoice_types.dcm, sails.config.custom.irn_invoice_types.cancel_invoice]},
        status:                         {type: 'string', isIn: [sails.config.custom.irn_job_status.pending, sails.config.custom.irn_job_status.failed, sails.config.custom.irn_job_status.done, sails.config.custom.irn_job_status.error], defaultsTo: sails.config.custom.irn_job_status.pending},
        
        error_message:                  {type: 'string'},
        error_code:                     {type: 'string'},
        
        //  Fields from IRN Response
        irn:                            {type: 'string'},   //  Irn
        qrcode:                         {type: 'string'},   //  SignedQRCode
        signed_invoice:                 {type: 'string'},   //  SignedInvoice
        ack_date:                       {type: 'string'},   //  AckDate
        ack_no:                         {type: 'number'},   //  AckNo
        irn_status:                     {type: 'string'},   //  IrnStatus
        
        /*
        Gstin:                          {type: 'string', required: true},  //"29AAACW3775F000",
        Version:                        {type: 'string', defaultsTo: '1.03'},  //"1.03",    Because the current version is 1.03. Increase it whenever you want to
        Irn:                            {type: 'string'},  //"",
        Tran_TaxSch:                    {type: 'string', required: true},  //"GST",
        Tran_SupTyp:                    {type: 'string', required: true},  //"B2B",
        Tran_RegRev:                    {type: 'string'},  //"N",
        Tran_Typ:                       {type: 'string', required: true},  //"REG",
        Tran_EcmGstin:                  {type: 'string'},  //"",
        Tran_IgstOnIntra:               {type: 'string'},  //"N",
        Doc_Typ:                        {type: 'string', required: true},  //"INV",
        Doc_No:                         {type: 'string', required: true},  //"112211QAQDX",
        Doc_Dt:                         {type: 'string', required: true},  //"13/08/2020",
        BillFrom_Gstin:                 {type: 'string', required: true},  //"29AAACW3775F000",
        BillFrom_LglNm:                 {type: 'string', required: true},  //"Webtel Electrosoft P. Ltd.",
        BillFrom_TrdNm:                 {type: 'string'},  //"Webtel Electrosoft P. Ltd.",
        BillFrom_Addr1:                 {type: 'string', required: true},  //"110-114",
        BillFrom_Addr2:                 {type: 'string'},  //"",
        BillFrom_Loc:                   {type: 'string', required: true},  //"Raje Place",
        BillFrom_Pin:                   {type: 'string', required: true},  //"562160",
        BillFrom_Stcd:                  {type: 'string', required: true},  //"29",
        BillFrom_Ph:                    {type: 'string'},  //"",
        BillFrom_Em:                    {type: 'string'},  //"",
        BillTo_Gstin:                   {type: 'string', required: true},  //"07AAACW3775F1Z8",
        BillTo_LglNm:                   {type: 'string', required: true},  //"Webtel Electrosoft P. Ltd.",
        BillTo_TrdNm:                   {type: 'string'},  //"Webtel Electrosoft P. Ltd.",
        BillTo_Pos:                     {type: 'string', required: true},  //"07",
        BillTo_Addr1:                   {type: 'string', required: true},  //"110-114",
        BillTo_Addr2:                   {type: 'string'},  //"",
        BillTo_Loc:                     {type: 'string', required: true},  //"Rajendra Place",
        BillTo_Pin:                     {type: 'string'},  //"110008",
        BillTo_Stcd:                    {type: 'string'},  //"07",
        BillTo_Ph:                      {type: 'string'},  //"",
        BillTo_Em:                      {type: 'string'},  //"",
        Item_SlNo:                      {type: 'string', required: true},  //"1",
        Item_PrdDesc:                   {type: 'string'},  //"Web-e-Invoice Solution",
        Item_IsServc:                   {type: 'string', required: true},  //"N",
        Item_HsnCd:                     {type: 'string', required: true},  //"1001",
        Item_Barcde:                    {type: 'string'},  //"",
        Item_Qty:                       {type: 'string'},  //"1",
        Item_FreeQty:                   {type: 'string'},  //"0",
        Item_Unit:                      {type: 'string'},  //"NOS",
        Item_UnitPrice:                 {type: 'string', required: true},  //"100000",
        Item_TotAmt:                    {type: 'string', required: true},  //"100000",
        Item_Discount:                  {type: 'string'},  //"",
        Item_PreTaxVal:                 {type: 'string'},  //"100000",
        Item_AssAmt:                    {type: 'string'},  //"100000",
        Item_GstRt:                     {type: 'string', required: true},  //"18",
        Item_IgstAmt:                   {type: 'string'},  //"18000",
        Item_CgstAmt:                   {type: 'string'},  //"",
        Item_SgstAmt:                   {type: 'string'},  //"",
        Item_CesRt:                     {type: 'string'},  //"",
        Item_CesAmt:                    {type: 'string'},  //"",
        Item_CesNonAdvlAmt:             {type: 'string'},  //"",
        Item_StateCesRt:                {type: 'string'},  //"",
        Item_StateCesAmt:               {type: 'string'},  //"",
        Item_StateCesNonAdvlAmt:        {type: 'string'},  //"",
        Item_OthChrg:                   {type: 'string'},  //"",
        Item_TotItemVal:                {type: 'string', required: true},  //"118000",
        Item_OrdLineRef:                {type: 'string'},  //"",
        Item_OrgCntry:                  {type: 'string'},  //"",
        Item_PrdSlNo:                   {type: 'string'},  //"",
        Item_Attrib_Nm:                 {type: 'string'},  //"Support Type^Tenure",
        Item_Attrib_Val:                {type: 'string'},  //"On-Site^1-Year",
        Item_Bch_Nm:                    {type: 'string'},  //"",
        Item_Bch_ExpDt:                 {type: 'string'},  //"",
        Item_Bch_WrDt:                  {type: 'string'},  //"",
        Val_AssVal:                     {type: 'string', required: true},  //"100000",
        Val_CgstVal:                    {type: 'string'},  //"",
        Val_SgstVal:                    {type: 'string'},  //"",
        Val_IgstVal:                    {type: 'string'},  //"18000",
        Val_CesVal:                     {type: 'string'},  //"",
        Val_StCesVal:                   {type: 'string'},  //"",
        Val_Discount:                   {type: 'string'},  //"",
        Val_OthChrg:                    {type: 'string'},  //"",
        Val_RndOffAmt:                  {type: 'string'},  //"",
        Val_TotInvVal:                  {type: 'string', required: true},  //"118000",
        Val_TotInvValFc:                {type: 'string'},  //"",
        Pay_Nm:                         {type: 'string'},  //"",
        Pay_AccDet:                     {type: 'string'},  //"",
        Pay_Mode:                       {type: 'string'},  //"",
        Pay_FinInsBr:                   {type: 'string'},  //"",
        Pay_PayTerm:                    {type: 'string'},  //"",
        Pay_PayInstr:                   {type: 'string'},  //"",
        Pay_CrTrn:                      {type: 'string'},  //"",
        Pay_DirDr:                      {type: 'string'},  //"",
        Pay_CrDay:                      {type: 'string'},  //"",
        Pay_PaidAmt:                    {type: 'string'},  //"",
        Pay_PaymtDue:                   {type: 'string'},  //"",
        Ref_InvRm:                      {type: 'string'},  //"",
        Ref_InvStDt:                    {type: 'string'},  //"",
        Ref_InvEndDt:                   {type: 'string'},  //"",
        Ref_PrecDoc_InvNo:              {type: 'string'},  //"",
        Ref_PrecDoc_InvDt:              {type: 'string'},  //"",
        Ref_PrecDoc_OthRefNo:           {type: 'string'},  //"",
        Ref_Contr_RecAdvRefr:           {type: 'string'},  //"",
        Ref_Contr_RecAdvDt:             {type: 'string'},  //"",
        Ref_Contr_TendRefr:             {type: 'string'},  //"",
        Ref_Contr_ContrRefr:            {type: 'string'},  //"",
        Ref_Contr_ExtRefr:              {type: 'string'},  //"",
        Ref_Contr_ProjRefr:             {type: 'string'},  //"",
        Ref_Contr_PORefr:               {type: 'string'},  //"",
        Ref_Contr_PORefDt:              {type: 'string'},  //"",
        AddlDoc_Url:                    {type: 'string'},  //"www.webtel.in^www.gstinindia.in",
        AddlDoc_Docs:                   {type: 'string'},  //"",
        AddlDoc_Info:                   {type: 'string'},  //"",
        CDKey:                          {type: 'string', required: true},  //"1000687",
        EInvUserName:                   {type: 'string', required: true},  //"29AAACW3775F000",
        EInvPassword:                   {type: 'string', required: true},  //"Admin!23..",
        EFUserName:                     {type: 'string', required: true},  //"29AAACW3775F000",
        EFPassword:                     {type: 'string', required: true},  //"Admin!23.."


        Gstin:                          {type: 'string', required: true},  //"29AAACW3775F000",
        Version:                        {type: 'string', defaultsTo: '1.03'},  //"1.03",    Because the current version is 1.03. Increase it whenever you want to
        Irn:                            {type: 'string'},  //"",
        Tran_TaxSch:                    {type: 'string', required: true},  //"GST",
        Tran_SupTyp:                    {type: 'string', required: true},  //"B2B", Type of supply Appendix 1   *** B2B, SEZWP, SEZWOP
        Tran_RegRev:                    {type: 'string'},  //"N",   Reverse Charge: Refer Appendix 2    ? *** Y, N
        Tran_Typ:                       {type: 'string', required: true},  //"REG", Refer Appendix 3    ? *** REG, SHP, DIS, CMB
        Tran_IgstOnIntra:               {type: 'string'},  //"N",   N - - Default, Y- indicates the supply is intra state but chargeable to IGST
        Doc_Typ:                        {type: 'string', required: true},  //"INV",     Refer Appendix 4    *** INV, CRN, DBN
        Doc_No:                         {type: 'string', required: true},  //"112211QAQDX", Document Number
        Doc_Dt:                         {type: 'string', required: true},  //"13/08/2020",  Document Date
        
        BillFrom_Gstin:                 {type: 'string', required: true},  //"29AAACW3775F000", Bill from GST
        BillFrom_LglNm:                 {type: 'string', required: true},  //"Webtel Electrosoft P. Ltd.",  Bill from Legal Name
        BillFrom_TrdNm:                 {type: 'string'},  //"Webtel Electrosoft P. Ltd.",  Bill from Trade Name
        BillFrom_Addr1:                 {type: 'string', required: true},  //"110-114", Bill from Address
        BillFrom_Addr2:                 {type: 'string'},  //"",    ?
        BillFrom_Loc:                   {type: 'string', required: true},  //"Raje Place",  Bill from location
        BillFrom_Pin:                   {type: 'string', required: true},  //"562160",  Bill from Pincode
        BillFrom_Stcd:                  {type: 'string', required: true},  //"29",  Bill from Statecode Refer to appendix 7
        BillFrom_Ph:                    {type: 'string'},  //"",    Bill from Phone
        BillFrom_Em:                    {type: 'string'},  //"",    Bill from Email

        BillTo_Gstin:                   {type: 'string', required: true},  //"07AAACW3775F1Z8", Bill to GSTIN  
        BillTo_LglNm:                   {type: 'string', required: true},  //"Webtel Electrosoft P. Ltd.",  Legal Name
        BillTo_TrdNm:                   {type: 'string'},  //"Webtel Electrosoft P. Ltd.",  Bill To trader Name
        BillTo_Pos:                     {type: 'string', required: true},  //"07",  State code of Place of supply. If POS lies outside the country, the code shall be 96 : Refer to Appendix – 7
        BillTo_Addr1:                   {type: 'string', required: true},  //"110-114",
        BillTo_Addr2:                   {type: 'string'},  //"",            ?
        BillTo_Loc:                     {type: 'string', required: true},  //"Rajendra Place",  Bill to Location
        BillTo_Pin:                     {type: 'string'},  //"110008",  Bill to pincode
        BillTo_Stcd:                    {type: 'string'},  //"07",  Bill to Statecode Refer to appendix 7
        BillTo_Ph:                      {type: 'string'},  //"",    Bill to Phone
        BillTo_Em:                      {type: 'string'},  //"",    Bill to Email
        
        Item_SlNo:                      {type: 'string', required: true},  //"1",   Serial number of item   ?
        Item_PrdDesc:                   {type: 'string'},  //"Web-e-Invoice Solution",  Product Description
        Item_IsServc:                   {type: 'string', required: true},  //"N",   Is Service or Not ?
        Item_HsnCd:                     {type: 'string', required: true},  //"1001",    HSN Code
        Item_Qty:                       {type: 'string'},  //"1", Quantity
        Item_FreeQty:                   {type: 'string'},  //"0",   Free Quantity
        Item_Unit:                      {type: 'string'},  //"NOS", Unit of Measurement : Refer to Appendix – 6 ?
        Item_UnitPrice:                 {type: 'string', required: true},  //"100000",  Unit Price – Rate
        Item_TotAmt:                    {type: 'string', required: true},  //"100000", Gross Amount Amount (Unit Price * Quantity)
        Item_Discount:                  {type: 'string'},  //"",    "0"
        Item_PreTaxVal:                 {type: 'string'},  //"100000",  Pre Tax Value
        Item_AssAmt:                    {type: 'string'},  //"100000",Taxable Value (Total Amount - Discount)
        Item_GstRt:                     {type: 'string', required: true},  //"18",  IGST value in percentage
        Item_IgstAmt:                   {type: 'string'},  //"18000",IGST
        Item_CgstAmt:                   {type: 'string'},  //"",    CGST
        Item_SgstAmt:                   {type: 'string'},  //"",    SGST
        Item_OthChrg:                   {type: 'string'},  //"",    Total Item Value = Assessable Amount + CGST Amt + SGST Amt + Cess Amt + CesNonAdvlAmt + StateCesAmt + StateCesNonAdvlAmt+Otherchrg
        Item_TotItemVal:                {type: 'string', required: true},  //"118000",
//        Item_Attrib_Nm:                 {type: 'string'},  //"Support Type^Tenure", ?
//        Item_Attrib_Val:                {type: 'string'},  //"On-Site^1-Year",      ?
        Val_AssVal:                     {type: 'string', required: true},  //"100000",
        Val_CgstVal:                    {type: 'string'},  //"",    Total CGST
        Val_SgstVal:                    {type: 'string'},  //"",    Total SGST
        Val_IgstVal:                    {type: 'string'},  //"18000",Total IGST
        Val_OthChrg:                    {type: 'string'},  //"",    Other Charges
        Val_RndOffAmt:                  {type: 'string'},  //"",    Rounding off amount
        Val_TotInvVal:                  {type: 'string', required: true},  //"118000",
        */
    }
};

