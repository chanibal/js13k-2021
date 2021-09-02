#!/usr/bin/env bash

(
cat << END
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Death And Taxes JS13K</title>
	</head>
	<body style="margin:0">
		<script src="https://js13kgames.com/webxr-src/2021/three.js"></script>
		<script type="module">
END

npx rollup --format es init.js | npx terser --module -c passes=2 -m #--mangle-props

cat << END
		</script>
	</body>
</html>
END
) > minified.html

F=$(mktemp -u).zip
trap "rm \"$F\"" exit
7z a -mm=Deflate -mfb=258 -mpass=15 "$F" minified.html >/dev/null
wc "$F" -c

