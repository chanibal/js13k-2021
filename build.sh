#!/usr/bin/env bash

(
	head game.html -n 7
	echo ' 		<script src="https://js13kgames.com/webxr-src/2021/three.js"></script>'
	echo '      <script type="module">'
	npx rollup --format es src/init.js | npx terser --module -c passes=2 -m  #--mangle-props
	echo ' 		</script>'
	tail game.html -n +10
) >index.html

F="js13k-2021-chanibal.zip"
#trap "rm \"$F\"" exit
7z a "$F" -mx 9 index.html >/dev/null
wc "$F" -c

