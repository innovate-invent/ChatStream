#!/usr/bin/env bash

set -eo pipefail

if git status --porcelain -uno | grep -q '.'; then
  echo "There are uncommitted changes, stash them before creating a version."
  exit 1
fi

tag="$(date "+%Y-%m-%d_%s")"

npm run build
rm -rf "dist/versions/$tag"
mkdir -p "dist/versions/$tag"
cp dist/*.css dist/*.js dist/*.html dist/*.png "dist/versions/$tag/"
ln -sf "../../fontawesome-free-6.7.2-web/" "dist/versions/$tag/fontawesome-free-6.7.2-web"

cd dist/versions
echo '<html><body>' > ../versions.html
for v in *; do
  url="https://chatstream.i2labs.ca/versions/$v/chat.html"
  echo "<a href=\"$url\">$url</a><br>"
done >> ../versions.html
echo '</body></html>' >> ../versions.html

cd ../../
git add dist/versions/ dist/versions.html
git commit -m"Add version $tag"
