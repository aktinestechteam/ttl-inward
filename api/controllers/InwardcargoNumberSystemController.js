/**
 * InwardcargoNumberSystemController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	inwardcargonumbersystem: function(req, res) {
		/*var date = new Date(1647074466000);
		var month =(date.getMonth() + 1)<10? '0'+(date.getMonth() + 1):''+(date.getMonth() + 1);
		var year = date.getFullYear().toString().substr(-2);
		var towhich = 'CAN_';
		if((date.getMonth() + 1)<4) {
			year = year -1;
		}
		var inwardcargonumbersystem = {};
		inwardcargonumbersystem.number_identifier = towhich + '04' + year;
		InwardcargoNumberSystem.findOrCreate(inwardcargonumbersystem, inwardcargonumbersystem).exec(async(err, inwardcargonumbersys, wasCreated)=> {
			var seq_number = undefined;
			if (err) {
				return res.send({error: 'Something Happend During Creating Record'});
			} else {
				var seq_number = inwardcargonumbersys.number_sequence;
				seq_number++;
				InwardcargoNumberSystem.update({_id:inwardcargonumbersys.id}, {number_sequence:seq_number}).fetch().exec(function(err, updatedInwardcargoNumberSys){
					if (err) {
						return res.send({error: 'Something Happens During Updating Or Inserting'});
					} else {
						var leadingzero = '' +updatedInwardcargoNumberSys[0].number_sequence;
						var max_id_length = 5;
						while(leadingzero.length < max_id_length) {
							leadingzero = ('0' + leadingzero);
						}
						return res.send({seq_number: month + year + '/' + leadingzero});
					}
				});
			}
		});*/
		//console.log(1);
		sails.helpers.doInvoiceNumber.with({
			date: 1532131844436,//Date.now(),
			generate_number_for: 'INV'
		}).exec(function(err, no) {
			if(err)
				console.log(err);
			res.send(no);
		});
	}
};
