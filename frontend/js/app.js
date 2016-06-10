$('button').on('click', function() {
	var uri = $('input').val();

	if (! uri) {
		alert('Please provide a url.');
	}

	var url = 'http://localhost:1010/api/repo=' + uri;

	$.ajax({
		url: url,
		dataType: "jsonp",
		success: function (data) {
			console.log(data)
		}
	});

});
