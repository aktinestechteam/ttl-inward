module.exports = {


	friendlyName: 'Awb calculations',


	description: '',


	inputs: {
		awb_user_data: {
			type: 'json'
		},
		constants: {
			type: 'json'
		},
		collect_currency_exchangerate: {
			type: 'json'
		},
		usd_exchangerate: {
			type: 'json'
		}
	},


	exits: {

	},


	fn: function (inputs, exits) {

		//	Calculating DO Charges
		var calculated_values = {};
		inputs.awb_user_data.do_charge = inputs.constants.delivery_order_charge; //	This is common for all consignee types
		if (inputs.awb_user_data.consignee_type === 'Agent') {
			inputs.awb_user_data.break_bulk_charge = inputs.awb_user_data.no_of_hawb * inputs.constants.break_bulk_charges; // ToDo - check the number of houses here else throw error
		}

		//	Caluculating Delivery Charges
		if (inputs.awb_user_data.delivery_option === 'Baggage')
			inputs.awb_user_data.baggage_charge = inputs.constants.delivery_order_charge_baggage;
		else if (inputs.awb_user_data.delivery_option === 'Direct Delivery')
			inputs.awb_user_data.direct_delivery_charge = inputs.constants.direct_delivery_charges;

		//	Calculating Collect Charges and Fees
		inputs.awb_user_data.collect_charge = (inputs.awb_user_data.collect_weight_charge + inputs.awb_user_data.collect_valuation_charge + inputs.awb_user_data.collect_tax + inputs.awb_user_data.collect_due_agent_charge + inputs.awb_user_data.collect_due_carrier_charge) * inputs.collect_currency_exchangerate.value_local;
		var percentage_collect_fees_local_currency = ((inputs.awb_user_data.collect_weight_charge + inputs.awb_user_data.collect_valuation_charge) * inputs.collect_currency_exchangerate.value_local) * (inputs.constants.collect_fees_percentage / 100);
		var collect_fees_min_usd_in_local_currency = inputs.constants.collect_fees_min_usd * inputs.usd_exchangerate.value_local;

		//	We have to collect Collect Fees only if there exists collect charges. If there are no collect charges, then no collect fee should be applied. Else 0 vs $10 = $10 which will be wrong
		if (percentage_collect_fees_local_currency > 0)
			inputs.awb_user_data.collect_fee = Math.max(percentage_collect_fees_local_currency, collect_fees_min_usd_in_local_currency);
		else
			inputs.awb_user_data.collect_fee = 0;

		//	Calculating cartage charge
		var shipment_weight = inputs.awb_user_data.chargable_weight;
		if (shipment_weight < inputs.constants.cartage_charge_min_weight) {
			inputs.awb_user_data.cartage_charge = inputs.constants.cartage_charge_min;
		} else {
			inputs.awb_user_data.cartage_charge = inputs.constants.cartage_charge_min + ((shipment_weight - inputs.constants.cartage_charge_min_weight) * inputs.constants.cartage_charge_per_kg);
		}

		//	Miscellaneous charges
		inputs.awb_user_data.misc_charges = inputs.constants.miscellaneous_charges;

		//	Calculate GST here only (ToDo in the correct manner)
		{
			inputs.awb_user_data.gstin = inputs.constants.gstin_number;
			inputs.awb_user_data.hsn_code = inputs.constants.hsn;

			var consignee_gst = inputs.awb_user_data.consignee_gstn;
			var consignee_gst_code = '';
			var station_gst = inputs.constants.gstin_number;
			var station_gst_code = '';

			var calculate_igst = false;
			var calculate_sgst = false;
			var calculate_cgst = false;

			if (station_gst)
				station_gst_code = station_gst.substr(0, 2);

			if (consignee_gst)
				consignee_gst_code = consignee_gst.substr(0, 2);

			//	Apply GST only of the station has GST code, else the station cannot collect GST
			if (station_gst_code) {
				//	If the consignee has GST, then we have to know if cgst + sgst or only igst has to be calculated. If the consignee is sez, then it is straight forward to calculate the igst only.
				if (inputs.awb_user_data.consignee_is_sez) {
					calculate_igst = true;
				} else {
					if (consignee_gst_code) {
						if (station_gst_code != consignee_gst_code) {
							calculate_igst = true;
						} else {
							calculate_cgst = true;
							calculate_sgst = true;
						}
					} else {
						calculate_cgst = true;
						calculate_sgst = true;
					}
				}
			}

			if (calculate_cgst) {
				inputs.awb_user_data.cgst = (inputs.constants.cgst_percentage / 100) * (inputs.awb_user_data.do_charge + inputs.awb_user_data.break_bulk_charge + inputs.awb_user_data.direct_delivery_charge + inputs.awb_user_data.baggage_charge + inputs.awb_user_data.cartage_charge + inputs.awb_user_data.misc_charges);
			} else {
				inputs.awb_user_data.cgst = 0;
			}

			if (calculate_sgst) {
				inputs.awb_user_data.sgst = (inputs.constants.sgst_percentage / 100) * (inputs.awb_user_data.do_charge + inputs.awb_user_data.break_bulk_charge + inputs.awb_user_data.direct_delivery_charge + inputs.awb_user_data.baggage_charge + inputs.awb_user_data.cartage_charge + inputs.awb_user_data.misc_charges);
			} else {
				inputs.awb_user_data.sgst = 0;
			}

			if (calculate_igst) {
				inputs.awb_user_data.igst = (inputs.constants.igst_percentage / 100) * (inputs.awb_user_data.do_charge + inputs.awb_user_data.break_bulk_charge + inputs.awb_user_data.direct_delivery_charge + inputs.awb_user_data.baggage_charge + inputs.awb_user_data.cartage_charge + inputs.awb_user_data.misc_charges);
			} else {
				inputs.awb_user_data.igst = 0;
			}

			if (inputs.awb_user_data.gst_exemption == true) {
				inputs.awb_user_data.cgst = 0;
				inputs.awb_user_data.sgst = 0;
				inputs.awb_user_data.igst = 0;
			}
		}

		// All done.
		return exits.success(inputs.awb_user_data);
	}


};