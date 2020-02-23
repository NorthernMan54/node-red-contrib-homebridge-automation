#! /bin/sh

node parseAccessories.js samples/issue30.json | diff - samples/issue30_output.json
