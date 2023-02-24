/**
 * ExchangeRatesListController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
	// function to add exchangerates ,update exchangerates
	exchangerateslist: function(req, res) {
		var id = req.body.inwardcargo_exchangerates_id;
		var currencyName = req.body.inwardcargo_exchangerates_currency_name_input;
		var currencyLocalValue = req.body.inwardcargo_exchangerates_currency_value_input;
		var currencyEffectiveFrom = req.body.inwardcargo_exchangerates_effectivedate_type_select;
		var isCurrencyNameNum = /^\d+$/.test(currencyName);
		var isCurrencyValueNum = /^(0|[1-9]\d*)(\.\d{0,2})?$/.test(currencyLocalValue);

		if (currencyName == undefined || currencyName == null || currencyName == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Currency Name Cannot be blank');
			return res.send({error: 'Currency Name Cannot be blank', error_code:'ERR_ER_CURRENCYNAME_BLANK'});
		} else if (currencyLocalValue == undefined || currencyLocalValue == null || currencyLocalValue == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Currency Value Cannot be blank');
			return res.send({error: 'Currency Value Cannot be blank', error_code:'ERR_ER_CURRENCYVALUE_BLANK'});
		/*} else if (currencyEffectiveFrom == undefined || currencyEffectiveFrom == null || currencyEffectiveFrom == '') {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - ' + 'Currency Effective From Cannot be blank');
			return res.send({error: 'Currency Effective From Cannot be blank', error_code:'ERR_ER_EFFECTIVEFROM_BLANK'});
		*/} else if(isCurrencyNameNum){
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Currency Name cannot be a number');
			return res.send({error: 'Currency Name cannot be a number', error_code:'ERR_ER_CURRENCYNAME_NOTNUMBER'});
		} else if(Number(currencyLocalValue) <= 0){
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Currency Value cannot less than zero');
			return res.send({error: 'Currency Value cannot less than zero', error_code:'ERR_ER_CURRENCYVALUE_LESSTHANZERO'});
		} else if(!isCurrencyValueNum) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Currency Value must be a number upto 2 precision');
			return res.send({error: 'Currency Value must be a number upto 2 precision', error_code:'ERR_ER_CURRENCYVALUE_NUMBER'});
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (exchangerateslist - post) ExchangeRates all validation passed');
			if(id && currencyName && currencyLocalValue && (!currencyEffectiveFrom)) {
				ExchangeRates.update({_id: id}, {value_local: currencyLocalValue}).fetch().exec(function(err, updatedExchangeRates){
					if (err) {
						sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + err);
						return res.send({error: 'Something Happens During Updating Or Inserting'});
					} else {
						if(updatedExchangeRates) {
							sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (exchangerateslist - post) ExchangeRates updated successfully');
							return res.send({value: updatedExchangeRates});
						} else {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + 'Exchange rates may be undefined');
							return res.send({error: 'Exchange rates may be undefined'});
						}
					}
				});
			} else {
				ExchangeRates.findOrCreate({currency: currencyName.toUpperCase(), expires_on: sails.config.globals.expires_at_infinity}, { currency: currencyName.toUpperCase(), value_local: currencyLocalValue, effective_from: currencyEffectiveFrom})
					.exec(async(err, exchangerates, wasCreated)=> {
						if (err) {
							sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + err);
							return res.send({error: 'Something Happend During Creating Record'});
						} else {
							if(wasCreated) {
								if (err) {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + err);
									return res.send({error: 'Something Happend During Creating Record'});
								} else {
									sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (exchangerateslist - post) create exchangerates');
									return res.send({value: exchangerates});
								}
							} else {
								if (id) {
									ExchangeRates.update({currency: currencyName.toUpperCase(), expires_on: sails.config.globals.expires_at_infinity}, {expires_on: currencyEffectiveFrom - 1000}).fetch().exec(function(err, updatedExchangeRates){
										if (err) {
											sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post) ' + err);
											return res.send({error: 'Something Happens During Updating Or Inserting'});
										} else {
											sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (exchangerateslist - post) exchangerates Updated');
											var currentDateTs = new Date().getTime();
											if (currentDateTs > currencyEffectiveFrom) {
												sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post) ' + 'Current Date cannot be greater than effective from');
												return res.send({error: 'Current Date cannot be greater than effective from'});
											} else {
												ExchangeRates.create({currency: currencyName.toUpperCase(), value_local: currencyLocalValue, effective_from: currencyEffectiveFrom}).fetch().exec(function (err, createdExchangeRate) {
													if (err) {
														sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post) ' + err);
														return res.send({error: 'Something Happend During Creating Record'});
													} else {
														sails.log.info(req.user.username + ' - ' + new Date() +' INFO - (exchangerateslist - post) ExchangeRate created');
														return res.send({value: createdExchangeRate});
													}
												});
											}
										}
									});
								} else {
									sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (exchangerateslist - post)' + sails.config.globals.uniqueError);
									return res.send({error: sails.config.globals.uniqueError, error_code:'ERR_ER_E_UNIQUE'});
								}
							}
						}
					});
			}
		}
	},
	//function to show exchangerates page
	getexchangerateslist: function(req, res) {
		var currentDate = new Date(new Date().setHours(0,0,0,0)).getTime();
		var noDatesToDisplay = sails.config.globals.display_effective_from_dates;
		//show exchangerates for user
		if (sails.config.custom.access_allowed(req.user.role, 'User')) {
			var currentTimeStamp = Date.now();
			ExchangeRates.find(
				{ where: {
					and : [
						{ expires_on: { '>': currentTimeStamp }},
						{ effective_from: { '<': currentTimeStamp }}
					]
				}, sort: 'currency'}
				, function(err, exchangerates) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getexchangerateslist - get)' + err);
					return res.view('pages/imlost', {error: 'Error while finding ExchangeRates while listing '});
				} else {
					sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (getexchangerateslist - get) find exchangerates who matches criteria and render ExchangeRates page');
					return res.view('pages/exchangerates',{currentDate: currentDate, noDatesToDisplay: noDatesToDisplay, exchangeratesdetails: exchangerates});
				}
			});
		} else {
			var currentDate = new Date(new Date().setHours(0,0,0,0)).getTime();
			var noDatesToDisplay = sails.config.globals.display_effective_from_dates;
			ExchangeRates.find({ where: {
					and : [
						{ expires_on: { '>': Date.now() }}
					]
				}, sort: 'currency'}, function(err, exchangerates) {
				if (err) {
					sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (getexchangerateslist - get)' + err);
					return res.view('pages/imlost', 'Error while finding ExchangeRates while listing');
				} else {
					sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (getexchangerateslist - get) find exchangerates who matches criteria and render ExchangeRates page');
					return res.view('pages/exchangerates',{currentDate: currentDate, noDatesToDisplay: noDatesToDisplay, exchangeratesdetails: exchangerates});
				}
			});
		}
	},
	deleteexchangerates:function(req, res){
	var deleteExchangeRateId = req.body.inwardcargo_exchangerates_delete_exchangerates;
		ExchangeRates.destroy({'_id' : deleteExchangeRateId }).exec(function(err, exchangerates){
		if(err) {
			sails.log.error(req.user.username + ' - ' + new Date() +' ERR - (deleteexchangerates - post)' + err);
			return res.view('pages/imlost', 'Error while deleting ExchangeRate');
		} else {
			sails.log.info(req.user.username + ' - ' + new Date() +'INFO - (deleteexchangerates - post) delete exchangerates who matches criteria and render ExchangeRates page');
			return res.redirect('/exchangerates');
		}
	});
}
};
