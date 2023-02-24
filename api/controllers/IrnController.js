/**
 * IrnController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const { isNumeric } = require("voca");

module.exports = {
	
	irnlist: async function(req, res) {
		
		let days = Number(req.params.days);
		days = isNumeric(days) ? days : 0;
		console.log("days", days);

		let query = {};

		if(isNumeric(days)) {
			let that_day = new Date();
			that_day.setMilliseconds(0);
			that_day.setSeconds(0);
			that_day.setMinutes(0);
			that_day.setHours(0);
			that_day.setDate(that_day.getDate() - days);

			query.createdAt = {'>=': that_day.getTime()};
		}
		
		let irnlist = await IRN.find(query);

		/*for(let i = 0; i < irnlist.length; i++) {
			if(irnlist[i].type_of_invoice == 'INVOICE') {
				let invoice = await Invoice.findOne({invoice_number: irnlist[i].invoice_number});
				irnlist[i].invoice = invoice;
			}
		}*/
		res.view('pages/irnlist', {irnlist: irnlist});
	},

	retryirn: async function(req, res) {
		let id = req.params.id;
		if(id) {
			let irn = await IRN.findOne({id: id});
			if(irn) {
				await IRN.update({id: id}).set({status: sails.config.custom.irn_job_status.pending});
				await sails.helpers.eInvoice.with({id: id});
				res.ok();
			} else {
				res.send('No IRN found');
			}
		} else {
			res.send('There is no id received');
		}
	}
}
