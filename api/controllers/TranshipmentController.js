/**
 * TranshipmentController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	showtranshipmentpage: async function(req, res) {
		let inward_ports = await Ports.find({ where: {and : [{ is_inward_port : true },{ iata_code: req.user.iata_code }]}, sort: 'iata_code'});
		res.view('pages/transhipment-list', {inward_ports: inward_ports});
	},
	
	gettranshipmentdata: async function(req, res) {
		console.log(req.body);
		
		let query = {};
		query.where = {
			and: [
				{createdAt: {'>': req.body.start_date}},
				{createdAt: {'<': req.body.end_date}},
			]
		};
		//query.where.and.push({igm_city: req.body.station})
		//	Showing all the transhipments which are gathered at a station or to be arrived at a destination.
		query.where.and.push({or: [{igm_city: req.body.station}, {destination: req.body.station}]});
		
		let transhipments = await Transhipment.find(query);
		res.send({data: transhipments});
	},
	
	submitTranshipmentTransferInputs: async function(req, res) {
		console.log(req.body);
		if(req.body.id && req.body.transhipment_add_comments_modal_transfer_igm_input && req.body.transhipment_add_comments_modal_transfer_date_input && req.body.transhipment_add_comments_modal_transfer_comments_input) {
			
			//	Get a transhipment based on id and check its pieces
			//	If the pieces available in the db matches with received pieces, just update the transhipment with basic details
			//	If the pieces available in the db are more than received pieces, then create new tranship with balance pieces, and update the existing record with received pieces.
			
			let original = await Transhipment.findOne({id: req.body.id});
			
			if(original.no_of_pieces_rx == Number(req.body.transhipment_add_pieces_modal_transfer_igm_input)) {
				await Transhipment.update({id: req.body.id}).set({
					transfer_vehicle_number: req.body.transhipment_add_comments_modal_transfer_igm_input,
					transfer_date: req.body.transhipment_add_comments_modal_transfer_date_input,
					transfer_comments: req.body.transhipment_add_comments_modal_transfer_comments_input	,
					transfer_comments_by: req.user.username
				});
			}
			
			
			if(original.no_of_pieces_rx > Number(req.body.transhipment_add_pieces_modal_transfer_igm_input)) {
				let balance_pcs = original.no_of_pieces_rx - Number(req.body.transhipment_add_pieces_modal_transfer_igm_input);
				let balance_wt = original.weight_rx - Number(req.body.transhipment_add_weight_modal_transfer_igm_input);
				
				let balance_transhipment = await Transhipment.create({
					igm_city: original.igm_city,
					awb_number: original.awb_number,
					source: original.source,
					destination: original.destination,
					igm_no_rx: original.igm_no_rx,
					flight_no_rx: original.flight_no_rx,
					no_of_pieces_rx: balance_pcs,
					weight_rx: balance_wt,
					commodity: original.commodity
				});
				
				console.log(balance_transhipment);
				
				await Transhipment.update({id: req.body.id}).set({
					transfer_vehicle_number: req.body.transhipment_add_comments_modal_transfer_igm_input,
					transfer_date: req.body.transhipment_add_comments_modal_transfer_date_input,
					transfer_comments: req.body.transhipment_add_comments_modal_transfer_comments_input	,
					transfer_comments_by: req.user.username,
					no_of_pieces_rx: Number(req.body.transhipment_add_pieces_modal_transfer_igm_input),
					weight_rx: Number(req.body.transhipment_add_weight_modal_transfer_igm_input),
				});
			}
		}
		
		res.json({});
	}
}