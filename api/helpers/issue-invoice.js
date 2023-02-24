module.exports = {


	friendlyName: 'Issue invoice',


	description: '',


	inputs: {
		awb_user_datas: {type: 'json'},
		dcms: {type: 'json'},
		credit_period_from:{type: 'number'},
		credit_period_to:{type: 'number'},
		generated_by:{type: 'string'}
	},


	exits: {

	},


	fn: function (inputs, exits) {
		
		sails.log.info(' - ' + new Date() + ' Entry inside for generation of invoice for AWB count = ' + inputs.awb_user_datas.length);
		
		var now_date = Date.now();
		var wkhtmltopdf = require('wkhtmltopdf');
		const os = require('os');
		sails.config.globals.async.waterfall([
			function(callback) {
				sails.helpers.doInvoiceNumber.with({
					date: now_date,
					generate_number_for: 'INV',
					city: inputs.awb_user_datas[0].igm_city,
					slash_between_month_year: true
				}).exec(function(err, number_sequence) {
					if(err) {
						sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err);
						callback('error while getting sequence number');
					} else {
						sails.log.info(' - ' + new Date() + ' , sequence number - ' + number_sequence.seq_number);
						if(number_sequence.error)
							callback(number_sequence.error, null);
						else
							callback(null, number_sequence.seq_number);
					}
				});
			},
			function(seq_number, callback) {
				var awb_ids = [];
				var dcm_ids = [];
				var total = 0;
				
				sails.log.info(' - ' + new Date() + 'sequence number = ' + seq_number);

				for(var i = 0; i < inputs.awb_user_datas.length; i++) {
					var awb_user_data = inputs.awb_user_datas[i];
					awb_ids.push(awb_user_data.id);

					total += awb_user_data.do_charge + awb_user_data.break_bulk_charge + awb_user_data.baggage_charge + awb_user_data.cartage_charge + awb_user_data.collect_charge + awb_user_data.collect_fee + awb_user_data.misc_charges + awb_user_data.igst + awb_user_data.sgst + awb_user_data.cgst + awb_user_data.direct_delivery_charge;
				}

				if(false && inputs.dcms)	//	Forcing it to be false so that DCM are not picked. Remove false and the DCM shall start appearing in the part 2 of invoice statement for credit customers.
					for(var i = 0; i < inputs.dcms.length; i++) {
						dcm_ids.push(inputs.dcms[i].id);
					}

				var invoice_no = seq_number + '/' + inputs.awb_user_datas[0].igm_city;
				sails.log.info(' - ' + new Date() + 'creating invoice for number = ' + invoice_no);

				Invoice.create({
					invoice_number: invoice_no,
					invoice_issue_date: now_date,
					dcms: dcm_ids,
					awb_user_datas: awb_ids,
					igm_city: inputs.awb_user_datas[0].igm_city,
					consignee: inputs.awb_user_datas[0].consignee,
					amount_billed: total,
					credit_period_to: inputs.credit_period_to,
					credit_period_from: inputs.credit_period_from,
					generated_by: inputs.generated_by}).fetch().exec(function(err, invoice){
					if(err) {
						sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err + ' - invoice number - ' + invoice_no);
						callback('Error while creating the Invoice', null);
					} else {
						sails.log.info(' - ' + new Date() + ', invoice created ' + invoice.id);
						callback(null, awb_ids, invoice);
					}
				});
			},
			function(awb_ids, invoice, callback) {
				sails.log.info(' - ' + new Date() + ', updating all the awbs for the invoice id = ' + invoice.id);
				AwbUserData.update({_id: awb_ids}).set({invoice_document: invoice.id, invoice_issue_date: now_date}).fetch().exec(function(err, updated_awb_user_datas) {
					if(err) {
						sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err);
						callback('Error while update the AWB user data', null);
					} else {
						if(updated_awb_user_datas) {
							sails.log.info(' - ' + new Date() + ', after updating the awbs');
							callback(null, invoice, updated_awb_user_datas);
						} else {
							callback('could not update the AWB user data', null)
						}
					}
				});
			},
			async function(invoice, updated_awb_user_datas, callback) {
				//	Generate IRN for B2B customers.
				if(sails.config.custom.e_invoice_supported && updated_awb_user_datas && updated_awb_user_datas[0].consignee_gstn) {
					//	Request for IRN as it is for customers.
					let irn = await IRN.create({
						invoice_number: invoice.invoice_number,
						type_of_invoice: sails.config.custom.irn_invoice_types.invoice,
						status: sails.config.custom.irn_job_status.pending
					}).fetch();

					console.log('irn', irn);
					let irn_response = await sails.helpers.eInvoice.with({id: irn.id});
					console.log('irn_response', irn_response);
					
					if(irn_response.success) {
						callback(null, invoice);
					} else {
						callback(irn_response.error, invoice);
					}
					
				} else {
					if(updated_awb_user_datas && updated_awb_user_datas[0].consignee_email) {
					
						var invoice_num = ''+invoice.invoice_number;
						var res = invoice_num.replace(/\//g, "_");
						var filename = 'pdf/invoice_' + res + '.pdf';
						
						sails.helpers.printEmailPdf.with({
							url: 'http://localhost:1337/invoice?invoice_id=' + invoice.id + '&print=' + true,
							to_email_address: updated_awb_user_datas[0].consignee_email,
							email_subject: 'IAGC Import Cargo Invoice - ' + invoice.invoice_number,
							email_html_body: '<div><p>Dear Sir/Madam,</p><p>Please find attached invoice No. ' + invoice.invoice_number + '. Kindly make the payment within 4 days of the receipt of the invoice and send us the payment confirmation.</p><p>Regards,</p><p>' + sails.config.globals.airlines_name + '.</p><p><i>This is a system generated email, please do not reply to this email id.&nbsp; In case of any queries, kindly contact our local ' + sails.config.globals.airlines_name + ' office.</i></p></div>',
							filename: filename,
						}).exec(function(err, response) {
							if(err || !response) {
								sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper on printEmailPdf)' + err);
							}
							callback(null, invoice);
						});
					} else {
						sails.log.info(' - ' + new Date() + ', consignee has no email address');
						callback(null, invoice);
					}
				}
			},
			function(invoice, callback) {
				if(invoice.dcms && invoice.dcms.length > 0) {
					sails.log.info(' - ' + new Date() + ', updating DCMs');
					DCM.update({_id: invoice.dcms}).set({invoiced_under_invoice_id: invoice.id}).exec(function(err, result) {
						if(err) {
							sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + err);
							callback('Error in updating the DCM on invoice creation', null);
						} else {
							callback(null, invoice);
						}
					});
				} else {
					sails.log.info(' - ' + new Date() + ', No DCMs');
					callback(null, invoice);
				}
			}
		], function(error, result) {
			if(error) {
				sails.log.error(' - ' + new Date() +' ERR - (issue-invoice - helper)' + error);
				exits.success({error: error});
			} else {
				sails.log.info(' - ' + new Date() + ', Exiting Invoice generation');
				exits.success(result);
			}
		});
	}
};
