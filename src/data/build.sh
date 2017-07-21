rm output.js 2> /dev/null
printf "'use strict';\n\n(function(){\n" > tmp
for f in *.js; do (cat "${f}"; echo) >> tmp; done
printf "\n})();" >> tmp
mv tmp output.js
