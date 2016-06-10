$('button').on('click', function() {
	var uri = $('input').val();

	if (! uri) {
		alert('Please provide a url.');
	}

	var url = 'http://localhost:8080/repo=' + uri;

	$.ajax({
		url: url,
		dataType: "jsonp",
		success: function (data) {
			console.log(data)
		}
	});

});
