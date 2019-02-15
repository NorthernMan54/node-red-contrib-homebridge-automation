#! /bin/sh

echo "NPM Publishing is disabled at this time"
if npm audit; then
  rm *orig* 
  npm run-script document
  npm run-script api
  git add .
  git commit -m "$1"
 # npm version patch -m "$1"
 # npm publish
  git commit -m "$1"
  git push origin master --tags
else
  echo "Not publishing due to security vulnerabilites"
fi
