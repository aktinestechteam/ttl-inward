function errorSwal(title, text, cb) {
	let swal_dialog = swal({
		title: title,
		text: text,
		imageUrl: '/images/alert_cross.png',
		background: '#fff',
		imageWidth: 150,
		imageHeight: 150,
		confirmButtonText: 'OK'
	});

	if (cb) {
		swal_dialog.then((result) => cb(result));
	}
}
function checkinvoice(){
	$("#inwardcargo_invoice_search_invoiceno_input").addClass('is-invalid');
	$( "#inwardcargo_consignees_list_fullname_input" ).after( "<div class='invalid-feedback invalid-fullname'>Name Cannot be blank</div>");
}

/*function getCSRFToken(callback) {
	if(#{sails.config.security.csrf}) {
		$.get( "/csrfToken", function( data ) {
			if(data && data._csrf) {
				callback(data._csrf);
			} else {
				errorSwal('Error', 'Please login again');
				callback(null);
			}
		});
	} else {
		callback(null);
	}
}*/

//	getCSRFToken(function(_csrf) {
