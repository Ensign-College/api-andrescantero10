#!/bin/bash
git pull
npm install
zip -r lambda-andres-function.zip .
sam deploy --guided