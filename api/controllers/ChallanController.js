/**
 * ChallanController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
let {promisify} = require('util');
let fs = require('fs');

module.exports = {
	challans: async function(req, res) {
		let inward_ports = await Ports.find({ where: {and : [{ is_inward_port : true },{ iata_code: req.user.iata_code }]}, sort: 'iata_code'});
		res.view('pages/challans', {inward_ports: inward_ports, user: req.user});
	},
	
	getchallans: async function(req, res) {		
		let query = {};
		if(req.body.challan_no) {
			query.where = {
				and: [
					{city_iata_code: req.body.station},
					{challan_no: req.body.challan_no}
				]
			};
		} else {
			query.where = {
				and: [
					{city_iata_code: req.body.station},
					{createdAt: {'>': req.body.start_date}},
					{createdAt: {'<': req.body.end_date}},
				]
			};
		}
		
		let challans = await Challan.find(query);
		res.send({data: challans});
	},
		
	getawbsforinvoices: async function(req, res) {
		if(req.body.invoices) {
			let awb_user_datas = [];
			for(let index = 0; index < req.body.invoices.length; index++) {
				awb_user_datas.push(await AwbUserData.find({invoice_document: req.body.invoices[index]}));
			}
			res.json(sails.config.custom.jsonResponse(null, awb_user_datas));
		} else {
			res.json(sails.config.custom.jsonResponse('there exists no invoices for query', null));
		}
	},
		
	voidchallan: async function(req, res) {

		let now = Date.now();
		if(req.body.challan_id && req.body.void_reason) {
			let challan = await Challan.update({
				id: req.body.challan_id,
				void_on: 0,
			}).set({
				void_on: now,
				void_reason: req.body.void_reason,
				void_by: req.user.username,
				unique_challan: now,
			}).fetch().catch(err => {
				res.json(sails.config.custom.jsonResponse('Error in voiding the Challan', null));
			});
			if(challan) {
				res.json(sails.config.custom.jsonResponse(null, challan));
			}
		} else {
			res.json(sails.config.custom.jsonResponse('Important data is missing', null));
		}
	}
	
	/*uploadscannedffm: async function(req, res) {
		console.log(req.body);
		sails.config.custom.getdumppath('scanned_ffm', async function(err, path) {
			req.file('scannedffm_upload').upload({
				dirname:('.' + path),
				// You can apply a file upload limit (in bytes)
			}, async function whenDone(err, uploaded_files) {
				if (err) {
					console.log(err);
					res.json({errmsg: err});
				}
				
				sails.config.globals.async.each(
					uploaded_files, 
					 function(uploaded_file, callback){
						let moveFile = async () => {
							let mv = promisify(fs.rename);
							let final_path = path + Date.now() + '_' + uploaded_file.filename;
							await mv(uploaded_file.fd, '.' + final_path);
							
							ScannedFFM.update({id: req.body.scannedffm_id}).set({filepath: final_path, status: 'approval_pending', uploaded_by: req.user.username, uploaded_on: Date.now()}).exec(function(err, updated_scanned_ffm){
								callback();
							});
						}
						moveFile();	
					}, async function(err) {
						if(err){
							console.log(err);
						} else{
							//res.redirect('/demo')
							res.ok();
						}
					}
				);
			});
		});
	},
		
	scannedffmapproval: async function(req, res) {
		let scanned_ffm = await ScannedFFM.update({id: req.body.scannedffm_id}).set({status: req.body.scannedffm_approval_status, reason: req.body.scannedffm_approval_reason, approved_by: req.user.username, approved_on: Date.now()}).fetch();
		
		console.log(scanned_ffm);
		
		//	We have to create an actionable copy again for the user to upload the new scanned copy
		if(scanned_ffm[0].status === 'rejected' || scanned_ffm[0].status === 'revoked') {
			await ScannedFFM.create({igm: scanned_ffm[0].igm, igm_city: scanned_ffm[0].igm_city, status: 'upload_pending'});
		}
		
		res.ok();
	}*/
}