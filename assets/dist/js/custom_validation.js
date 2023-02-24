$('input[type=number]').keydown(function(e){
	switch(e.which || e.keyCode || e.charCode) {
		case 38: // up
		break;

		case 40: // down
		break;

		default: return; // exit this handler for other keys
	}
	e.preventDefault(); // prevent the default action (scroll / move caret)
});


$('input[type=number]').on('wheel', function(e){
    return false;
});
