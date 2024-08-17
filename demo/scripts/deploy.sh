# Script to publish "build" folder to Github pages
# Requires existing branch called "gh-pages"

git checkout -b gh-pages
git merge main
yarn build
cp -r build ../docs
