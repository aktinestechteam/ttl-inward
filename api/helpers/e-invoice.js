const fetch = require('node-fetch');
var Queue = require('better-queue');

var eInvoiceQueue = new Queue(async function (data, cb) {
	console.log('Invoice Queue', data);

	let irn_record = await IRN.findOne({id: data.id});

	if(!irn_record) {
		return cb('Could not find IRN request for id = ' + data.id, null);
	}

	console.log('working for IRN where invoice_number = ' + irn_record.invoice_number + ', status = ' + irn_record.status + ', type = ' + irn_record.type_of_invoice);

	if(irn_record && irn_record.status != sails.config.custom.irn_job_status.pending) {
		return cb('IRN request for id = ' + data.id + ' is already ' + irn_record.status, null);
	}

	let invoice_number;
	let invoice_id;
	let dcm_number;
	let dcm;

	switch(irn_record.type_of_invoice){

		case sails.config.custom.irn_invoice_types.invoice: {
			invoice_number = irn_record.invoice_number;
		} break;
		
		case sails.config.custom.irn_invoice_types.dcm: {
			dcm_number = irn_record.invoice_number;
			dcm = await DCM.findOne({dcm_number: dcm_number});
			if(!dcm) {
				return cb('No DCM found for ' + data.id, data.id);
			}
			invoice_id = dcm.base_invoice_id;
		} break;
		
		case sails.config.custom.irn_invoice_types.cancel_invoice: {
			invoice_number = irn_record.invoice_number;
		} break;
	}

	console.log('invoice_number', invoice_number);
	let invoice = invoice_number ? await Invoice.findOne({invoice_number: invoice_number}) : await Invoice.findOne({id: invoice_id});
	if(!invoice) {
		return cb('No Invoice found for ' + data.id, data.id);
	}

	let awb_user_datas = await AwbUserData.find({id: invoice.awb_user_datas});

	let city_constant = await CityConstants.findOne({
		and : [
			{ iata_code: awb_user_datas[0].igm_city},	//	Simple JUGAD
			{ expires_on: { '>': invoice.invoice_issue_date }},
			{ effective_from: { '<': invoice.invoice_issue_date }}
		]
	});

	let from_gst = await Gst.findOne({gst_code: city_constant.gstin_number.substr(0,2)});
	let consignee_gst = await Gst.findOne({gst_code: awb_user_datas[0].consignee_gstn.substr(0,2)});
	
	let EInvPassword;
	let EInvUserName;
	let Gstin;
	let pincode;
	{
		switch(city_constant.iata_code) {
			case 'BLR': {
				EInvPassword = (sails.config.environment == 'production') ? 'British@7987BLR' : 'Admin!23..';
				EInvUserName = (sails.config.environment == 'production') ? 'bakr_123_API_BLR' : '29AAACW3775F000';
				Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : '29AAACW3775F000';
				pincode = (sails.config.environment == 'production') ? '560029' : '560029';
			} break;
			case 'BOM': {
				EInvPassword = (sails.config.environment == 'production') ? 'British@7987BOM' :'Admin!23';
				EInvUserName = (sails.config.environment == 'production') ? 'bamh_123_API_BOM' :'27AAACW3775F007';
				Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number :'27AAACW3775F007';
				pincode = (sails.config.environment == 'production') ? '400099' :'400099';
			} break;
			case 'DEL': {
				EInvPassword = (sails.config.environment == 'production') ? 'British@7987DEL' : 'Admin!23';
				EInvUserName = (sails.config.environment == 'production') ? 'badel_123_API_DEL' : '07AAACW3775F006';
				Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : '07AAACW3775F006';
				pincode = (sails.config.environment == 'production') ? '110037' : '110037';
			} break;
			case 'HYD': {
				EInvPassword = (sails.config.environment == 'production') ? 'British@7987HYD' : 'Admin!23';
				EInvUserName = (sails.config.environment == 'production') ? 'batg_123_API_HYD' : '36AAACW3775F039';
				Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : '36AAACW3775F039';
				pincode = (sails.config.environment == 'production') ? '501218' : '501218';
			} break;
			case 'MAA': {
				EInvPassword = (sails.config.environment == 'production') ? 'British@7987MAA' : 'Admin!23';
				EInvUserName = (sails.config.environment == 'production') ? 'batn_123_API_MAA' : '33AAACW3775F036';
				Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : '33AAACW3775F036';
				pincode = (sails.config.environment == 'production') ? '600004' : '600004';
			} break;
		}
	}

	let json_body = {
		CDKey: (sails.config.environment == 'production') ? '1695109' : "1000687",
		EInvUserName: EInvUserName,
		EInvPassword: EInvPassword,
		EFUserName: (sails.config.environment == 'production') ? '325C8C6C-F45D-4D89-AD3D-D5E7726C45EF' : "29AAACW3775F000",
		EFPassword: (sails.config.environment == 'production') ? '9FA550E9-1544-4D6C-AE51-D2695AAD7F72' : "Admin!23..",
	};

	let url;

	switch(irn_record.type_of_invoice){
		case sails.config.custom.irn_invoice_types.invoice: {
			
			url = (sails.config.environment == 'production') ? 'https://einvlive.webtel.in/v1.03/GenIRN' : 'https://einvSandbox.webtel.in/v1.03/GenIRN';
			//url = 'http://localhost:1337/GenIRN';

			json_body.Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : EInvUserName;//"29AAACW3775F000";//awb_user_datas[0].gstin;
			json_body.Version =  "1.03";
			//json_body.Irn =  "";
			json_body.Tran_TaxSch =  "GST";
			json_body.Tran_SupTyp =  awb_user_datas[0].consignee_is_sez ? (awb_user_datas[0].gst_exemption ? "SEZWOP" :"SEZWP") : "B2B";
			json_body.Tran_RegRev =  "N";
			json_body.Tran_Typ =  "REG";
			json_body.Tran_IgstOnIntra = awb_user_datas[0].consignee_is_sez ? "Y" : "N";
			json_body.Doc_Typ =  "INV";
			json_body.Doc_No =  invoice.invoice_number;
			json_body.Doc_Dt =  sails.config.custom.getReadableDate(invoice.createdAt, false, '/');	//"***************************";
			
			json_body.BillFrom_Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : EInvUserName;//"29AAACW3775F000";//awb_user_datas[0].gstin;
			json_body.BillFrom_LglNm = (sails.config.environment == 'production') ? sails.config.globals.airlines_name : "Webtel Electrosoft P. Ltd.";
			json_body.BillFrom_TrdNm = (sails.config.environment == 'production') ? sails.config.globals.airlines_name : "Webtel Electrosoft P. Ltd.";
			json_body.BillFrom_Addr1 = city_constant.registered_address.substr(0, 100);
			json_body.BillFrom_Addr2 = city_constant.registered_address.substr(100, 100);
			json_body.BillFrom_Loc = from_gst.state_name;//"Bangalore";//"***********************";
			json_body.BillFrom_Pin = pincode;//"562160";//"***********************";
			json_body.BillFrom_Stcd = "" + from_gst.gst_code;
			//json_body.BillFrom_Ph = "";
			//json_body.BillFrom_Em = "";
	
			json_body.BillTo_Gstin = awb_user_datas[0].consignee_gstn;
			json_body.BillTo_LglNm = awb_user_datas[0].consignee_name;
			json_body.BillTo_TrdNm = awb_user_datas[0].consignee_name;
			json_body.BillTo_Pos = "" + consignee_gst.gst_code;
			json_body.BillTo_Addr1 = awb_user_datas[0].consignee_address.length > 100 ? awb_user_datas[0].consignee_address.substr(0, 100) : awb_user_datas[0].consignee_address;
			json_body.BillTo_Addr2 = awb_user_datas[0].consignee_address.length > 100 ? awb_user_datas[0].consignee_address.substr(100, 100) : awb_user_datas[0].consignee_address2;
			json_body.BillTo_Loc = consignee_gst.state_name;//"Pune";//"**************************";
			json_body.BillTo_Pin = awb_user_datas[0].consignee_pincode;
			json_body.BillTo_Stcd = "" + consignee_gst.gst_code;
			
			/*if(awb_user_datas[0].consignee_phone)
				json_body.BillTo_Ph = awb_user_datas[0].consignee_phone;
			if(awb_user_datas[0].consignee_email)
				json_body.BillTo_Em = awb_user_datas[0].consignee_email;*/
			
			json_body.Item_SlNo = "1";
			json_body.Item_PrdDesc = "Import Delivery Order Fee";
			json_body.Item_IsServc = "Y";
			json_body.Item_HsnCd = city_constant.hsn;
			json_body.Item_Qty = "1";
			//json_body.Item_FreeQty = "";
			json_body.Item_Unit = "OTH";	//	OTHERS

			let freight_charges = 0;
			let do_other_charges = 0;
			let igst_charges = 0;
			let cgst_charges = 0;
			let sgst_charges = 0;
			let total_charges = 0;
			
			for (var i = 0; i < awb_user_datas.length; i++) {
				freight_charges = freight_charges + awb_user_datas[i].collect_fee + awb_user_datas[i].collect_charge;
				do_other_charges = do_other_charges + awb_user_datas[i].break_bulk_charge + awb_user_datas[i].cartage_charge + awb_user_datas[i].do_charge + awb_user_datas[i].baggage_charge + awb_user_datas[i].direct_delivery_charge + awb_user_datas[i].misc_charges;
				igst_charges = igst_charges + awb_user_datas[i].igst;
				cgst_charges = cgst_charges + awb_user_datas[i].cgst;
				sgst_charges = sgst_charges + awb_user_datas[i].sgst;
			}

			total_charges = freight_charges + do_other_charges + igst_charges + cgst_charges + sgst_charges;

			json_body.Item_UnitPrice = "" + do_other_charges.toFixed(2);
			json_body.Item_TotAmt = "" + do_other_charges.toFixed(2);
			json_body.Item_Discount = "0";
			json_body.Item_PreTaxVal = "" + do_other_charges.toFixed(2);
			json_body.Item_AssAmt = "" + do_other_charges.toFixed(2);
			json_body.Item_GstRt = "" + city_constant.igst_percentage;
			json_body.Item_IgstAmt = "" + igst_charges.toFixed(2);
			json_body.Item_CgstAmt = "" + cgst_charges.toFixed(2);
			json_body.Item_SgstAmt = "" + sgst_charges.toFixed(2);
			json_body.Item_OthChrg = "0";// + freight_charges.toFixed(2);
			json_body.Item_TotItemVal = "" + (do_other_charges + igst_charges + cgst_charges + sgst_charges).toFixed(2);
			json_body.Val_AssVal = "" + do_other_charges.toFixed(2);
			json_body.Val_CgstVal = "" + cgst_charges.toFixed(2);
			json_body.Val_SgstVal = "" + sgst_charges.toFixed(2);
			json_body.Val_IgstVal = "" + igst_charges.toFixed(2);
			json_body.Val_OthChrg = "" + freight_charges.toFixed(2);
			json_body.Val_RndOffAmt = "" + (Math.ceil(total_charges) - total_charges).toFixed(2);
			json_body.Val_TotInvVal = "" + Math.ceil(total_charges).toFixed(2);
		} break;

		case sails.config.custom.irn_invoice_types.dcm: {
			url = (sails.config.environment == 'production') ? 'https://einvlive.webtel.in/v1.03/GenIRN' : 'https://einvSandbox.webtel.in/v1.03/GenIRN';
			//url = 'http://localhost:1337/GenIRN';	

			json_body.Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : EInvUserName;//"29AAACW3775F000";//awb_user_datas[0].gstin;
			json_body.Version =  "1.03";
			//json_body.Irn =  "";
			json_body.Tran_TaxSch =  "GST";
			json_body.Tran_SupTyp =  awb_user_datas[0].consignee_is_sez ? (awb_user_datas[0].gst_exemption ? "SEZWOP" :"SEZWP") : "B2B";
			json_body.Tran_RegRev =  "N";
			json_body.Tran_Typ =  "REG";
			json_body.Tran_IgstOnIntra = awb_user_datas[0].consignee_is_sez ? "Y" : "N";
			
			//let incorrect_amount = dcm.incorrect_amount.reduce((acc, val) => acc + val) + dcm.incorrect_igst.reduce((acc, val) => acc + val) + dcm.incorrect_cgst.reduce((acc, val) => acc + val) + dcm.incorrect_sgst.reduce((acc, val) => acc + val);
			let correct_amount = dcm.correct_amount.reduce((acc, val) => acc + val);
			let total_correct_amount = correct_amount + dcm.igst + dcm.cgst + dcm.sgst + dcm.other_charges;

			json_body.Doc_Typ =  (dcm.revised_total < 0) ? "CRN" : "DBN";
			json_body.Doc_No =  dcm_number;
			json_body.Doc_Dt =  sails.config.custom.getReadableDate(dcm.createdAt, false, '/');	//"***************************";
			
			json_body.BillFrom_Gstin = (sails.config.environment == 'production') ? city_constant.gstin_number : EInvUserName;//"29AAACW3775F000";//awb_user_datas[0].gstin;
			json_body.BillFrom_LglNm = (sails.config.environment == 'production') ? sails.config.globals.airlines_name : "Webtel Electrosoft P. Ltd.";
			json_body.BillFrom_TrdNm = (sails.config.environment == 'production') ? sails.config.globals.airlines_name : "Webtel Electrosoft P. Ltd.";
			json_body.BillFrom_Addr1 = city_constant.registered_address.substr(0, 100);
			json_body.BillFrom_Addr2 = city_constant.registered_address.substr(100, 100);
			json_body.BillFrom_Loc = from_gst.state_name;//"Bangalore";//"***********************";
			json_body.BillFrom_Pin = pincode;//"562160";//"***********************";
			json_body.BillFrom_Stcd = "" + from_gst.gst_code;
			//json_body.BillFrom_Ph = "";
			//json_body.BillFrom_Em = "";
	
			json_body.BillTo_Gstin = awb_user_datas[0].consignee_gstn;
			json_body.BillTo_LglNm = awb_user_datas[0].consignee_name;
			json_body.BillTo_TrdNm = awb_user_datas[0].consignee_name;
			json_body.BillTo_Pos = "" + consignee_gst.gst_code;
			json_body.BillTo_Addr1 = awb_user_datas[0].consignee_address.length > 100 ? awb_user_datas[0].consignee_address.substr(0, 100) : awb_user_datas[0].consignee_address;
			json_body.BillTo_Addr2 = awb_user_datas[0].consignee_address.length > 100 ? awb_user_datas[0].consignee_address.substr(100, 100) : awb_user_datas[0].consignee_address2;
			
			json_body.BillTo_Loc = consignee_gst.state_name;//"Pune";//"**************************";
			json_body.BillTo_Pin = awb_user_datas[0].consignee_pincode;
			json_body.BillTo_Stcd = "" + consignee_gst.gst_code;
			
			/*if(awb_user_datas[0].consignee_phone)
				json_body.BillTo_Ph = awb_user_datas[0].consignee_phone;
			if(awb_user_datas[0].consignee_email)
				json_body.BillTo_Em = awb_user_datas[0].consignee_email;*/
			
			json_body.Item_SlNo = "1";
			json_body.Item_PrdDesc = "Import Delivery Order Fee";
			json_body.Item_IsServc = "Y";
			json_body.Item_HsnCd = city_constant.hsn;
			json_body.Item_Qty = "1";
			//json_body.Item_FreeQty = "";
			json_body.Item_Unit = "OTH";	//	OTHERS

			let freight_charges = 0;
			let do_other_charges = 0;
			let igst_charges = 0;
			let cgst_charges = 0;
			let sgst_charges = 0;
			let total_charges = 0;
			
			for (var i = 0; i < awb_user_datas.length; i++) {
				freight_charges = freight_charges + awb_user_datas[i].collect_fee + awb_user_datas[i].collect_charge;
				do_other_charges = do_other_charges + awb_user_datas[i].break_bulk_charge + awb_user_datas[i].cartage_charge + awb_user_datas[i].do_charge + awb_user_datas[i].baggage_charge + awb_user_datas[i].direct_delivery_charge + awb_user_datas[i].misc_charges;
				igst_charges = igst_charges + awb_user_datas[i].igst;
				cgst_charges = cgst_charges + awb_user_datas[i].cgst;
				sgst_charges = sgst_charges + awb_user_datas[i].sgst;
			}

			total_charges = freight_charges + do_other_charges + igst_charges + cgst_charges + sgst_charges;

			json_body.Item_UnitPrice = "" + Math.abs(correct_amount - do_other_charges).toFixed(2);
			json_body.Item_TotAmt = "" + Math.abs(correct_amount - do_other_charges).toFixed(2);
			json_body.Item_Discount = "0";
			json_body.Item_PreTaxVal = "" + Math.abs(correct_amount - do_other_charges).toFixed(2);
			json_body.Item_AssAmt = "" + Math.abs(correct_amount - do_other_charges).toFixed(2);
			json_body.Item_GstRt = "" + city_constant.igst_percentage;
			json_body.Item_IgstAmt = "" + Math.abs(dcm.igst - igst_charges).toFixed(2);
			json_body.Item_CgstAmt = "" + Math.abs(dcm.cgst - cgst_charges).toFixed(2);
			json_body.Item_SgstAmt = "" + Math.abs(dcm.sgst - sgst_charges).toFixed(2);
			json_body.Item_OthChrg = "0";// + freight_charges.toFixed(2);
			json_body.Item_TotItemVal = "" + Math.abs((total_correct_amount - dcm.other_charges) - (total_charges - freight_charges)).toFixed(2);
			json_body.Val_AssVal = "" + Math.abs(correct_amount - do_other_charges).toFixed(2);
			json_body.Val_CgstVal = "" + Math.abs(dcm.cgst - cgst_charges).toFixed(2);
			json_body.Val_SgstVal = "" + Math.abs(dcm.sgst - sgst_charges).toFixed(2);
			json_body.Val_IgstVal = "" + Math.abs(dcm.igst - igst_charges).toFixed(2);
			json_body.Val_OthChrg = "" + Math.abs(dcm.other_charges - freight_charges).toFixed(2);
			json_body.Val_RndOffAmt = "" + (Math.ceil(Math.abs(total_correct_amount - total_charges).toFixed(2)) - Math.abs(total_correct_amount - total_charges).toFixed(2)).toFixed(2);
			json_body.Val_TotInvVal = "" + Math.ceil(Math.abs(total_correct_amount - total_charges).toFixed(2)).toFixed(2);

			console.log(total_correct_amount - total_charges);
		} break;
		
		case sails.config.custom.irn_invoice_types.cancel_invoice: {
			
			url = (sails.config.environment == 'production') ? 'http://Einvlive.webtel.in/v1.03/CanIRN' : 'https://einvSandbox.webtel.in/v1.03/CanIRN';
			//url = 'http://localhost:1337/CanIRN';

			json_body.Irn = irn_record.irn;
			json_body.Gstin = Gstin;//"29AAACW3775F000";//city_constant.gstin_number;
			json_body.CnlRsn = "2";
			json_body.CnlRem = "Incorrect Entry";
		} break;
	}

	console.log(JSON.stringify({Push_Data_List: {Data: [json_body]}}));
	console.log("url", url);

	//	TEMPORARY ONLY FOR TESTING DCM
	//return cb(null, data.id);

	fetch(url, {
		method: 'post',
		body:    JSON.stringify({Push_Data_List: {Data: [json_body]}}),
		headers: { 'Content-Type': 'application/json' },
	})
	.then(res => res.json())
	.then(async function(json) {
		console.log(json[0].ErrorCode);
		console.log(json[0].ErrorMessage);

		switch(json[0].Status) {
			case "0": {	//	Error
				
				await IRN.update({id: data.id}).set({irn_status: json[0].IrnStatus, status: sails.config.custom.irn_job_status.failed, error_message: json[0].ErrorMessage, error_code: json[0].ErrorCode});

				return cb(json[0].ErrorMessage, data.id);
			} break;
			case "1": {	//	Success
				await IRN.update({id: data.id}).set({irn: json[0].Irn, qrcode: json[0].SignedQRCode, signed_invoice: json[0].SignedInvoice, ack_date: json[0].AckDate, ack_no: json[0].AckNo, irn_status: json[0].IrnStatus, status: sails.config.custom.irn_job_status.done, error_message: json[0].ErrorMessage, error_code: json[0].ErrorCode});

				switch(irn_record.type_of_invoice) {
					case sails.config.custom.irn_invoice_types.invoice: {
						if(awb_user_datas && awb_user_datas[0].consignee_email) {
							
							let invoice_num = ''+invoice.invoice_number;
							let res = invoice_num.replace(/\//g, "_");
							let filename = 'pdf/invoice_' + res + '.pdf';
							
							let printEmailPDFResponse = await sails.helpers.printEmailPdf.with({
								url: 'http://localhost:1337/invoice?invoice_id=' + invoice.id + '&print=' + true,
								to_email_address: awb_user_datas[0].consignee_email,
								email_subject: 'IAGC Import Cargo Invoice - ' + invoice.invoice_number,
								email_html_body: '<div><p>Dear Sir/Madam,</p><p>Please find attached invoice No. ' + invoice.invoice_number + '. Kindly make the payment within 4 days of the receipt of the invoice and send us the payment confirmation.</p><p>Regards,</p><p>' + sails.config.globals.airlines_name + '.</p><p><i>This is a system generated email, please do not reply to this email id.&nbsp; In case of any queries, kindly contact our local ' + sails.config.globals.airlines_name + ' office.</i></p></div>',
								filename: filename,
							});
		
							if(!printEmailPDFResponse) {
								sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper on printEmailPdf)' + err);
							}
						}
					} break;
					case sails.config.custom.irn_invoice_types.dcm: {
					} break;
					case sails.config.custom.irn_invoice_types.cancel_invoice: {
					} break;
				}
				
				return cb(null, data.id);
			} break;
		}
		
	}).catch(async function(e) {
		console.log(e.message);
		await IRN.update({id: data.id}).set({status: sails.config.custom.irn_job_status.error, error_message: e.message, error_code: e.errno});
		cb(e.message, data.id);
	});
}, { maxTimeout: 40000 });

module.exports = {

	friendlyName: 'E-Invoice Helper',


	description: 'Helps to generate IRN, cancel IRN',


	inputs: {
		id: {type: 'string', required: true}
	},


	exits: {
	},

	fn: function (inputs, exits) {

		if(sails.config.custom.e_invoice_supported) {
			eInvoiceQueue.push({id: inputs.id}, function(error, result) {
				console.log('helper result', result);
				if(error) {
					exits.success({success: false, error: error});
				} else {
					exits.success({success: true});
				}
			});
		} else {
			exits.success({success: true});
		}
	}
};
