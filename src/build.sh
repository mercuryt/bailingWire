cd data
./build.sh
cd ../html
./build.sh
cd ..
rm output.js 2> /dev/null
printf "'use strict';\n\n(function(){\nvar dataBinding, htmlBinding;\n" > tmp
cat ./data/output.js >> tmp
cat ./html/output.js >> tmp
printf "\n})();" >> tmp
mv tmp output.js
