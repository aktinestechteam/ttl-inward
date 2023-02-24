/**
 * Global Variable Configuration
 * (sails.config.globals)
 *
 * Configure which global variables which will be exposed
 * automatically by Sails.
 *
 * For more information on any of these options, check out:
 * https://sailsjs.com/config/globals
 */

module.exports.globals = {

  /****************************************************************************
  *                                                                           *
  * Whether to expose the locally-installed Lodash as a global variable       *
  * (`_`), making  it accessible throughout your app.                         *
  * (See the link above for help.)                                            *
  *                                                                           *
  ****************************************************************************/

  _: require('@sailshq/lodash'),

  /****************************************************************************
  *                                                                           *
  * Whether to expose the locally-installed `async` as a global variable      *
  * (`async`), making it accessible throughout your app.                      *
  * (See the link above for help.)                                            *
  *                                                                           *
  ****************************************************************************/

  async: require('async'),

  /****************************************************************************
  *                                                                           *
  * Whether to expose each of your app's models as global variables.          *
  * (See the link at the top of this file for more information.)              *
  *                                                                           *
  ****************************************************************************/

  models: true,

  /****************************************************************************
  *                                                                           *
  * Whether to expose the Sails app instance as a global variable (`sails`),  *
  * making it accessible throughout your app.                                 *
  *                                                                           *
  ****************************************************************************/

  sails: true,

  /****************************************************************************
  *                                                                           *
  * app_name: Name of the application that can be used at various places      *
  *                                                                           *
  ****************************************************************************/

  app_name: 'TTL - IDOS v1.0',

  /****************************************************************************
  *                                                                           *
  * airlines_name: Name of the airlines that can be used at various places    *
  *                                                                           *
  ****************************************************************************/

  airlines_name: 'British Airways',

  /****************************************************************************
  *                                                                           *
  * customer_name: Name of the customer that can be used at various places    *
  *                                                                           *
  ****************************************************************************/

  customer_name: 'TT Logistics and Cargo Pvt Ltd.',

  /****************************************************************************
  *                                                                           *
  * Expires at infinity - currently chosen 01 Jan 2050                        *
  *                                                                           *
  ****************************************************************************/

  expires_at_infinity: 2556143999000,

  /****************************************************************************
  *                                                                           *
  * Display 'effective from' date options for as many days in advance         *
  *                                                                           *
  ****************************************************************************/

  display_effective_from_dates: 30,

  /****************************************************************************
  *                                                                           *
  * Display various types of reasons								          *
  *                                                                           *
  ****************************************************************************/

  reasonType: ['Reasons for deleting HAWB', 'Reasons for changing IGM','Reasons for voiding AWB', 'Reasons for voiding DO', 'Reasons for voiding Invoice','Part AWB Edit Reasons'],

  /****************************************************************************
  *                                                                           *
  * Display Error Messages								                      *
  *                                                                           *
  ****************************************************************************/

  uniqueError: 'Entry Already Exist',

  /****************************************************************************
  *                                                                           *
  * Display Local Currency Symbol								                      *
  *                                                                           *
  ****************************************************************************/

  local_currency_symbol: '₹',

  /****************************************************************************
  *                                                                           *
  * General Function for formating the value as price		                  *
  *                                                                           *
  ****************************************************************************/

  price_formatter: function(value) {
	var n1, n2;
	value = value.toFixed(2) + '' || '';
	// works for integer and floating as well
	n1 = value.split('.');
	n2 = n1[1] || null;
	n1 = n1[0].replace(/(\d)(?=(\d\d)+\d$)/g, "$1,");
	value = n2 ? n1 + '.' + n2 : n1;

	return value;
  },

  /****************************************************************************
  *                                                                           *
  * General Function for formating the date as dd/mm/yyyy		                  *
  *                                                                           *
  ****************************************************************************/

  date_formatter: function(value) {
		var today = new Date(Number(value));
	var dd = today.getDate();
	var mm = today.getMonth() + 1; //January is 0!

	var yyyy = today.getFullYear();
	if (dd < 10) {
	  dd = '0' + dd;
	}
	if (mm < 10) {
	  mm = '0' + mm;
	}
	var today = dd + '/' + mm + '/' + yyyy;
	return today;
  },

  /****************************************************************************
  *                                                                           *
  * General Function for checking if the date falls in voidable range		  *
  *                                                                           *
  ****************************************************************************/

  check_voidable: function(input_date_in_ms, invoice_irn) {
	var now_date = Date.now();
	if(input_date_in_ms <= 0)
    return false;
    
  //  As per e-invoicing rules, for B2B customers (having GST) the invoice voiding should not be allowed 
  if(invoice_irn && invoice_irn.ack_date) {
    let ack_date = new Date(invoice_irn.ack_date);
    return ((now_date - ack_date.getTime()) < 24 * 60 * 60 * 1000);
  }

  var last_date_to_void = new Date(input_date_in_ms);

	//	Change the input date to the next month
	last_date_to_void.setMonth(last_date_to_void.getMonth() + 1);
	//	Set the date from the database after which voiding is not possible
	last_date_to_void.setDate(4);
	//	Rest set to 0 so that it becomes midnight 00:00:00
	last_date_to_void.setHours(0);
	last_date_to_void.setMinutes(0);
	last_date_to_void.setSeconds(0);
	last_date_to_void.setMilliseconds(0);

	return last_date_to_void.getTime() > Date.now();
  },

  /****************************************************************************
  *                                                                           *
  * LDAP server URL	and Port												  *
  *                                                                           *
  ****************************************************************************/

  //ldap_access_url: 'ec2-18-212-38-229.compute-1.amazonaws.com',	//	Development
  //ldap_access_url: 'ec2-13-233-21-200.ap-south-1.compute.amazonaws.com',
  //ldap_access_url: '52.66.73.250',	//	Production public access
  ldap_access_url: 'ttgroupglobal.local',	//	Production private access
  ldap_access_port: '636',

  win32_wkhtmltopdf_path: 'F:/wkhtmltopdf/bin/wkhtmltopdf.exe',

	/****************************************************************************
	*                                                                           *
	* 					function for logging 																						  *
	*                                                                           *
	****************************************************************************/
	putinfolog: function(user, actionname, methodtype, message) {
		var formattedactionname = actionname;
		return sails.log.info(user + ' - ' + new Date() +' INFO -  ('+ formattedactionname + ' - ' + methodtype +' ) '+ message);
	}
};
