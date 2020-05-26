# node-webserver

A lightweight web server for small apps. This is an evolving project and
is being used in several internal applications at the moment.


## Installation
This module is not currently registered with NPM. In order to install, you must use the following command:

`npm install git+https://github.com/unidyne/node-webserver.git`


## Extensions

Extensions enhance and extend the functionality of the core web server.
A couple of extensions are included:

* Ninja: Exposes functions as web-addressable JSON endpoints
* Browse: Directory and image browsing

The Browse extension will be enhanced further. The idea is to eventually
provide complete remote file access to selected directories. This is mostly
for use with IoT and systems which dump images and data files in an output
directory.

An extension for Digest Authentication and Web Tokens will be added soon.

