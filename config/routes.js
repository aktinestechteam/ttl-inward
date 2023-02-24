/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {


	//  ╦ ╦╔═╗╔╗ ╔═╗╔═╗╔═╗╔═╗╔═╗
	//  ║║║║╣ ╠╩╗╠═╝╠═╣║ ╦║╣ ╚═╗
	//  ╚╩╝╚═╝╚═╝╩  ╩ ╩╚═╝╚═╝╚═╝

	/***************************************************************************
	*                                                                          *
	* Make the view located at `views/homepage.ejs` your home page.            *
	*                                                                          *
	* (Alternatively, remove this and add an `index.html` file in your         *
	* `assets` directory)                                                      *
	*                                                                          *
	***************************************************************************/
	"GET /csrfToken": { action: "security/grant-csrf-token" },
	"GET /probe": function(req, res) {res.ok()},
	'GET /': 'IndexController.index',
	'GET /imlost': {view: 'pages/imlost'},
	'GET /index': 'IndexController.index',
	//'GET /invoice2': {view: 'pages/invoice2'},
	'GET /getxls': 'DailyReportsController.getxls',
	'GET /dailyreports': 'DailyReportsController.dailyreports',
	'POST /generatedailychallanreports': 'DailyReportsController.generatedailychallanreports',
	'POST /generatedailygstreports': 'DailyReportsController.generatedailygstreports',
	'POST /generatedailygstreports_v2': 'DailyReportsController.generatedailygstreports_v2',
	'POST /generatemonthlyreports': 'DailyReportsController.generatemonthlyreports',
	'POST /generateimportstatisticsreports': 'DailyReportsController.generateimportstatisticsreports',
	'POST /generatependingdoreports': 'DailyReportsController.generatependingdoreports',
	'POST /generateimportcsrreports': 'DailyReportsController.generateimportcsrreports',
	'POST /cashchqstatement': 'DailyReportsController.generatedailycheckcashdepositstatement',
	'POST /generateagentperformancereports': 'DailyReportsController.generateagentperformancereports',
	'POST /getconsigneelistreport': 'DailyReportsController.getconsigneelistreport',
	'POST /getpendingdocumentsreport': 'DailyReportsController.getpendingdocumentsreport',
	'GET /generatecreditinvoice': 'DoController.dolist',
	'POST /generatecreditinvoice': 'InvoiceController.generateinvoicedo',
	'GET /invoicelist': 'InvoiceController.getinvoicelist',
	'POST /invoicelist': 'InvoiceController.invoicelist',
	'POST /searchusinginvoiceno': 'InvoiceController.searchusinginvoiceno',
	'GET /dcm': 'DCMController.dcm',
	'POST /dcm': 'DCMController.dcmgenerate',
	'GET /chqreq': 'DCMController.getchqreq',
	'POST /chqreq': 'DCMController.postchqreq',
	'POST /saveconsigneegstin': 'admin/ConsigneesController.saveconsigneegstin',
	'POST /saveconsigneegstinsavedawb': 'admin/ConsigneesController.saveconsigneegstinsavedawb',

	// routes for inward-cargo
	//'GET /constants': 'admin/ConstantsController.userconstant',
	'GET /constants': 'admin/ConstantsController.getconstantlist',
	'POST /constants': 'admin/ConstantsController.constants',
	'GET /consignees': 'admin/ConsigneesController.getconsigneeslist',
	'POST /consignees': 'admin/ConsigneesController.consignees',
	'GET /exchangerates': 'admin/ExchangeRatesListController.getexchangerateslist',
	'POST /exchangerates': 'admin/ExchangeRatesListController.exchangerateslist',
	'POST /deleteexchangerates': 'admin/ExchangeRatesListController.deleteexchangerates',
	'GET /reasons': 'admin/ReasonsController.getreasonslist',
	'POST /reasons': 'admin/ReasonsController.reasons',
	'POST /deletereason': 'admin/ReasonsController.deletereason',
	'GET /airportlist': 'admin/AirportListController.getairportlist',
	'POST /airportlist': 'admin/AirportListController.airportlist',
	'POST /deleteairport': 'admin/AirportListController.deleteairport',
	'GET /addairports': 'admin/AirportListController.addairports',
	'GET /gstcodes': 'admin/GstCodesController.getgstcodes',
	'POST /gstcodes': 'admin/GstCodesController.gstcodes',
	'POST /deletegstcodes': 'admin/GstCodesController.deletegstcodes',
	'GET /igm': 'user/IgmController.getigmlist',
	'POST /igm': 'user/IgmController.igmupload',
	'GET /getigm/:id': 'user/IgmController.getigm',
	'GET /approveigm/:id': 'user/IgmController.approveigm',
	'GET /declineigm/:id': 'user/IgmController.declineigm',
	'POST /searchusingigmno': 'user/IgmController.searchusingigmno',
	'POST /changeigmnumber': 'user/IgmController.changeigmnumber',
	'GET /getreasonsforchangeigm': 'user/IgmController.getreasonsforchangeigm',
	'POST /saveawbmanually': 'user/IgmController.saveawbmanually',
	'GET /can': 'CanController.can',
	'POST /can': 'CanController.createcan',
	'POST /estimatedocost': 'CanController.estimatedocost',
	'GET /invoice': 'InvoiceController.invoice',
	'GET /issuecreditinvoice': 'InvoiceController.issuecreditinvoice',
	'POST /invoice': 'InvoiceController.invoicepaymetreceived',
	'GET /invoicepdf': 'InvoiceController.invoicepdf',
	'GET /invoice2pdf': 'InvoiceController.invoice2pdf',
	'POST /issueinvoice': 'InvoiceController.issueinvoice',
	'POST /voidinvoice': 'InvoiceController.voidinvoice',
	'POST /createdo': 'DoController.createdo',
	'GET /do': 'DoController.do',
	'POST /voiddo': 'DoController.voiddo',
	'GET /dopdf': 'DoController.dopdf',
	'GET /canpdf': 'CanController.canpdf',
	'GET /awb': 'user/AwbController.awbdetails',
	'GET /getreasonsforvoid': 'user/AwbController.getreasonsforvoid',
	'POST /deletepartawb': 'user/AwbController.deletepartawb',
	'POST /awb': 'user/AwbController.awbsubmit',
	'POST /changeAWBDestination': 'user/AwbController.changeAWBDestination',
	'POST /requestdeletepartawb': 'user/AwbController.requestdeletepartawb',
	'GET /approvepartawbdeletion/:id': 'user/AwbController.approvepartawbdeletion',
	'GET /declinepartawbdeletion/:id': 'user/AwbController.declinepartawbdeletion',
	'GET /getgstcode': 'user/AwbController.getgstcode',
	'POST /partawbedit': 'user/AwbController.partawbedit',
	'POST /hawb': 'user/HawbController.hawb',
	'GET /getreasonsfordeletehawb': 'user/HawbController.getreasonsfordeletehawb',
	'POST /deletehawb': 'user/HawbController.deletehawb',
	'POST /awbgetconsigneedetails': 'user/AwbController.awbgetconsigneedetails',
	'POST /awbbroreceived': 'user/AwbController.awbbroreceived',
	'POST /voidawb': 'user/AwbController.voidawb',
	
	'GET /scannedffm': 'admin/ScannedFFMController.scannedffm',
	'POST /getscannedffmdata': 'admin/ScannedFFMController.getscannedffmdata',
	'POST /uploadscannedffm': 'admin/ScannedFFMController.uploadscannedffm',
	'POST /scannedffmapproval': 'admin/ScannedFFMController.scannedffmapproval',
	
	'GET /transhipment': 'TranshipmentController.showtranshipmentpage',
	'POST /gettranshipmentdata': 'TranshipmentController.gettranshipmentdata',
	'POST /submitTranshipmentTransferInputs': 'TranshipmentController.submitTranshipmentTransferInputs',
	
	'GET /challans': 'ChallanController.challans',
	'POST /getchallans': 'ChallanController.getchallans',
	'POST /getawbsforinvoices': 'ChallanController.getawbsforinvoices',
	'POST /voidchallan': 'ChallanController.voidchallan',

	'GET /irnlist/:days': 'IrnController.irnlist',
	'GET /regenerateinvoice/:id': 'InvoiceController.regenerateinvoice',	
	'GET /retryirn/:id': 'IrnController.retryirn',
	
	// routes for theme
	//'/blank-page': {view: 'pages/blank-page'},
	//'/index': {view: 'pages/index'},
	//'/index2': {view: 'pages/index2'},
	//'/': {view: 'pages/index'},
	//'/authentication-login': {view: 'pages/authentication-login'},

	//'GET /register': 'admin/UserController.registeruser',
	//'POST /register': 'admin/UserController.adduser',
	//'POST /deleteuser': 'admin/UserController.deleteuser',
	//'POST /changepassword': 'admin/UserController.changepassword',
	
	//'/blank': {view: 'pages/blank'},
	//'/igm': {view: 'pages/igm'},
	//'/error-403': {view: 'pages/error-403'},
	//'/error-404': {view: 'pages/error-404'},
	//'/error-405': {view: 'pages/error-405'},
	//'/error-500': {view: 'pages/error-500'},
//	'/charts': {view: 'pages/charts'},
//	'/form-basic': {view: 'pages/form-basic'},
//	'/form-wizard': {view: 'pages/form-wizard'},
//	'/grid': {view: 'pages/grid'},
	//'/icon-fontawesome': {view: 'pages/icon-fontawesome'},
	//'/icon-material': {view: 'pages/icon-material'},
//	'/pages-buttons': {view: 'pages/pages-buttons'},
//	'/pages-invoice': {view: 'pages/pages-invoice'},
//	'/pages-elements': {view: 'pages/pages-elements'},
//	'/pages-calendar': {view: 'pages/pages-calendar'},
//	'/pages-chat': {view: 'pages/pages-chat'},
//	'/pages-gallery': {view: 'pages/pages-gallery'},
	'GET /pages-invoice': 'InvoiceController.invoice',
	'GET  /login': 'AuthController.getlogin',
	'POST /login': 'AuthController.login',
	'GET  /loginldap': 'AuthController.getloginldap',
	'POST /loginldap': 'AuthController.loginldap',
	'/logout': 'AuthController.logout',
	//'/tables': {view: 'pages/tables'},
	//'/awb': {view: 'pages/awb'},
	//'/widgets': {view: 'pages/widgets'},
	'/readline': function (req, res, next) {
		sails.log.info('I am an info-level message.');
		sails.log('I am a debug-level message');
		sails.log.warn('I am a warn-level message');
		sails.log.error('I am a error-level message');
		sails.log.debug('I am a error-level message');
		sails.log.verbose('I am a error-level message');
		sails.log.silly('I am a error-level message');
	},
	'GET /demurrage': 'DoController.getDemurrage',
	'POST /demurrage': 'DoController.postDemurrage',

	/***************************************************************************
	*                                                                          *
	* More custom routes here...                                               *
	* (See https://sailsjs.com/config/routes for examples.)                    *
	*                                                                          *
	* If a request to a URL doesn't match any of the routes in this file, it   *
	* is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
	* not match any of those, it is matched against static assets.             *
	*                                                                          *
	***************************************************************************/


	//  ╔═╗╔═╗╦  ╔═╗╔╗╔╔╦╗╔═╗╔═╗╦╔╗╔╔╦╗╔═╗
	//  ╠═╣╠═╝║  ║╣ ║║║ ║║╠═╝║ ║║║║║ ║ ╚═╗
	//  ╩ ╩╩  ╩  ╚═╝╝╚╝═╩╝╩  ╚═╝╩╝╚╝ ╩ ╚═╝



	//  ╦ ╦╔═╗╔╗ ╦ ╦╔═╗╔═╗╦╔═╔═╗
	//  ║║║║╣ ╠╩╗╠═╣║ ║║ ║╠╩╗╚═╗
	//  ╚╩╝╚═╝╚═╝╩ ╩╚═╝╚═╝╩ ╩╚═╝


	//  ╔╦╗╦╔═╗╔═╗
	//  ║║║║╚═╗║
	//  ╩ ╩╩╚═╝╚═╝

	'GET /report': async function(req, res) {
		let days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
		let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul","Aug", "Sep", "Oct", "Nov", "Dec"];

		let awbuserdatas = await AwbUserData.find({"delivery_option": {"!=": "Normal"}, void_on: 0});
		//let dos = [];
		let result = [];
		for(let i = 0; i < awbuserdatas.length; i++) {
			let one_do = await Do.findOne({_id: awbuserdatas[i].do_document})
			//dos.push(one_do);
			if(one_do) {
				if(one_do.createdAt) {
					let do_date = new Date(one_do.createdAt);
					result.push({
						station: awbuserdatas[i].igm_city,
						awb: awbuserdatas[i].awb_number,
						do: one_do.do_number,
						delivery_option: awbuserdatas[i].delivery_option,
						do_issue_weekday: days[do_date.getDay()],
						do_issue_date: do_date.getDate(),
						do_month: months[do_date.getMonth()],
						do_year: do_date.getFullYear()
					});
				} else {
					result.push({
						station: awbuserdatas[i].igm_city,
						awb: awbuserdatas[i].awb_number,
						do: one_do.do_number,
						delivery_option: "",
						do_issue_weekday: "",
						do_issue_date: "",
						do_month: "",
						do_year: ""
					})
				}
			} else {
				console.log('skipping AWB = ' + awbuserdatas[i].awb_number + ', and id = ' + awbuserdatas[i].id);
			}
		}

		console.table(result);
		res.ok(result);
	},

	'GET /checkigm/:igm': async function(req, res) {
		await sails.helpers.performCanCheck.with({igm_no: req.params.igm});
		res.ok();
	},

	'GET /read': async function(req, res) {
        await sails.helpers.readEmail.with({});
        res.ok();
    },

    'GET /write': async function(req, res) {
        await sails.helpers.sendEmail.with({
            to: "naval@mobigic.com",
            subject: `Test email ${new Date()}`,
            body: `Sending Test email ${new Date()}`,
        })
        
        res.ok();
    },

    //  Azure OAuth2 Authentication and Access Key Management
    'GET /azure/tokens':                        'azure/AzureController.authenticate',
    'GET /azure/auth-redirect-read-email':      'azure/AzureController.handleReadEmailAuthentication',
    'GET /azure/auth-redirect-write-email':     'azure/AzureController.handleWriteEmailAuthentication',
    'GET /azure/refresh-token':                 'azure/AzureController.tokenRefresh',

    'GET /azure/authenticate': {view: 'oauth_authentication'},
    'GET /azure/auth-done': {view: 'thankyou'}
};

function getTimestampfromDateWithTime(datewithtime) {
	var voca = require('voca');
	var sliptdate = voca.split(datewithtime, ' ');
	var makewithoutcolon = sliptdate[1].replace(/:/g,'');
	var year = Number(voca.splice(sliptdate[0], 0, 4));
	var month = (Number(voca.splice(sliptdate[0], 0, 2)) - year)/10000;
	var day = (Number(sliptdate[0]) - ((month*10000)+ (year)))/1000000;
	var minute = Number(voca.splice(makewithoutcolon, 0, 2));
	var hour = (Number(makewithoutcolon-minute)/100);
	return new Date(year, month-1, day , hour, minute);
}
function getTimestampfromDate(date) {
	var voca = require('voca');
	var year = Number(voca.splice(date, 0, 4));
	var month = (Number(voca.splice(date, 0, 2)) - year)/10000;
	var day = (Number(date) - ((month*10000)+ (year)))/1000000;

	return new Date(year, month-1, day);
}
function getTimestampfromDateAndTime(date, time) {
	var voca = require('voca');
	var year = Number(voca.substring(date, 0, 4));
	var month = Number(voca.substring(date, 4, 6));
	var day = Number(voca.substr(date,6));
	var minute = Number(voca.splice(time, 0, 2));
	var hour = (Number(time-minute)/100);

	return new Date(year, month-1, day , hour, minute);
}
