/// <reference path="../models/dto.ts" />

import alertArgs = require("common/alertArgs");
import alertType = require("common/alertType");
import database = require("models/database");
import filesystem = require("models/filesystem/filesystem");
import resource = require("models/resource");
import appUrl = require("common/appUrl");
import shell = require("viewmodels/shell");
import oauthContext = require("common/oauthContext");
import forge = require("forge/forge_custom.min");

/// Commands encapsulate a read or write operation to the database and support progress notifications and common AJAX related functionality.
class commandBase {

    // TODO: better place for this?
    static ravenClientVersion = '3.0.0.0';
    static splashTimerHandle = 0;
    static loadingCounter = 0;

    constructor() {
    }

    execute<T>(): JQueryPromise<T> {
        throw new Error("Execute must be overridden.");
    }

    reportInfo(title: string, details?: string) {
        this.reportProgress(alertType.info, title, details);
    }

    reportError(title: string, details?: string, httpStatusText?: string) {
        this.reportProgress(alertType.danger, title, details, httpStatusText);
        if (console && console.log && typeof console.log === "function") {
            console.log("Error during command execution", title, details, httpStatusText);
        }
    }

    reportSuccess(title: string, details?: string) {
        this.reportProgress(alertType.success, title, details);
    }

    reportWarning(title: string, details?: string, httpStatusText?: string) {
        this.reportProgress(alertType.warning, title, details, httpStatusText);
    }

    urlEncodeArgs(args: any): string {
        var propNameAndValues = [];
        for (var prop in args) {
            var value = args[prop];
            if (value instanceof Array) {
                for (var i = 0; i < value.length; i++) {
                    propNameAndValues.push(prop + "=" + encodeURIComponent(value[i]));
                }
            } else if (value !== undefined) {
                propNameAndValues.push(prop + "=" + encodeURIComponent(value));
            }
        }

        return "?" + propNameAndValues.join("&");
    }

    query<T>(relativeUrl: string, args: any, resource?: resource, resultsSelector?: (results: any) => T, timeToAlert:number = 9000): JQueryPromise<T> {
        var ajax = this.ajax(relativeUrl, args, "GET", resource,null, timeToAlert);
        if (resultsSelector) {
            var task = $.Deferred();
            ajax.done((results, status, xhr) => {
                //if we fetched a database document, save the etag from the header
                if (results.hasOwnProperty('SecuredSettings')) {
                    results['__metadata'] = { '@etag': xhr.getResponseHeader('Etag') };
                }
                var transformedResults = resultsSelector(results);
                task.resolve(transformedResults);
            });
            ajax.fail((request, status, error) => {
                task.reject(request, status, error);
                });
            return task;
        } else {
            return ajax;
        }
    }
    
    head<T>(relativeUrl: string, args: any, resource?: resource, resultsSelector?: (results: any) => T): JQueryPromise<T> {
        var ajax = this.ajax(relativeUrl, args, "HEAD", resource);
        if (resultsSelector) {
            var task = $.Deferred();
            ajax.done((results, status, xhr) => {
                var allHeaders = xhr.getAllResponseHeaders();
                if (allHeaders) {
                    var headersObject = {};
                    var headersArray = xhr.getAllResponseHeaders().trim().split(/\r?\n/);
                    for (var n = 0; n < headersArray.length; n++) {
                        var keyValue = headersArray[n].split(": ");
                        if (keyValue.length == 2) {
                            //keyValue[1] = keyValue[1].replaceAll("\"", "");
                            headersObject[keyValue[0]] = keyValue[1];
                        }
                    }
                    var transformedResults = resultsSelector(headersObject);
                    task.resolve(transformedResults);
                }
            });
            ajax.fail((request, status, error) => {
                task.reject(request, status, error);
                });
            return task;
        } else {
            return ajax;
        }
    }

    put(relativeUrl: string, args: any, resource?: resource, options?: JQueryAjaxSettings): JQueryPromise<any> {
        return this.ajax(relativeUrl, args, "PUT", resource, options);
    }

    reset(relativeUrl: string, args: any, resource?: resource, options?: JQueryAjaxSettings): JQueryPromise<any> {
        return this.ajax(relativeUrl, args, "RESET", resource, options);
    }

    /*
     * Performs a DELETE rest call.
    */
    del(relativeUrl: string, args: any, resource?: resource, options?: JQueryAjaxSettings): JQueryPromise<any> {
        return this.ajax(relativeUrl, args, "DELETE", resource, options);
    }

    post(relativeUrl: string, args: any, resource?: resource, options?: JQueryAjaxSettings): JQueryPromise<any> {
        return this.ajax(relativeUrl, args, "POST", resource, options);
    }

    patch(relativeUrl: string, args: any, resource?: resource, options?: JQueryAjaxSettings): JQueryPromise<any> {
        return this.ajax(relativeUrl, args, "PATCH", resource, options);
    }

    private ajax(relativeUrl: string, args: any, method: string, resource?: resource, options?: JQueryAjaxSettings, timeToAlert: number = 9000): JQueryPromise<any> {
        var originalArguments = arguments;
        // ContentType:
        //
        // Can't use application/json in cross-domain requests, otherwise it 
        // issues OPTIONS preflight request first, which doesn't return proper 
        // headers(e.g.Etag header, etc.)
        // 
        // So, for GETs, we issue text/plain requests, which skip the OPTIONS
        // request and goes straight for the GET request.
        var contentType = method === "GET" ?
            "text/plain; charset=utf-8" :
            "application/json; charset=utf-8";
        var defaultOptions = {
            cache: false,
            url: appUrl.forResourceQuery(resource) + relativeUrl,
            data: args,
            dataType: "json",
            contentType: contentType, 
            type: method,
            headers: undefined
        };
        
        if (options) {
            for (var prop in options) {
                defaultOptions[prop] = options[prop];
            }
        }
        if (commandBase.loadingCounter == 0) {
            commandBase.splashTimerHandle = setTimeout(commandBase.showSpin, 1000, timeToAlert);
        }

        if (oauthContext.apiKey()) {
            if (!defaultOptions.headers) {
                defaultOptions.headers = {}
            }
            defaultOptions.headers["Has-Api-Key"] = "True";
        }

        if (oauthContext.authHeader()) {
            if (!defaultOptions.headers) {
                defaultOptions.headers = {}
            }
            defaultOptions.headers["Authorization"] = oauthContext.authHeader();
        }

        var ajaxTask = $.Deferred();

        commandBase.loadingCounter++;
        $.ajax(defaultOptions).always(() => {
            --commandBase.loadingCounter;
            if (commandBase.loadingCounter == 0) {
                clearTimeout(commandBase.splashTimerHandle);
                commandBase.hideSpin();
            }
        }).done((results, status, xhr) => {
                ajaxTask.resolve(results, status, xhr);
        }).fail((request, status, error) => {
            if (request.status == 412 && oauthContext.apiKey()) {
                this.handleOAuth(ajaxTask, request, originalArguments);
            } else {
                ajaxTask.reject(request, status, error);
            }
        });

        return ajaxTask.promise();
    }

    handleOAuth(task: JQueryDeferred<any>, request: JQueryXHR, originalArguments: IArguments) {
        var oauthSource = request.getResponseHeader('OAuth-Source');

        // issue request to oauth source endpoint to get RSA exponent and modulus
        $.ajax({
            type: 'POST',
            url: oauthSource,
            headers: {
                grant_type: 'client_credentials'
            }
        }).fail((request, status, error) => {
                if (request.status != 412) {
                    task.reject(request, status, error);
                } else {
                    var wwwAuth:string = request.getResponseHeader('WWW-Authenticate');
                    var tokens = wwwAuth.split(',');
                    var authRequest:any = {};
                    tokens.forEach(token => {
                        var eqPos = token.indexOf("=");
                        var kv = [token.substring(0, eqPos), token.substring(eqPos + 1)];
                        var m = kv[0].match(/[a-zA-Z]+$/g);
                        if (m) {
                            authRequest[m[0]] = kv[1];
                        } else {
                            authRequest[kv[0]] = kv[1];
                        }
                    });

                    // form oauth request

                    var data = this.objectToString({
                        exponent: authRequest.exponent,
                        modulus: authRequest.modulus,
                        data: this.encryptAsymmetric(authRequest.exponent, authRequest.modulus, this.objectToString({
                            "api key name": oauthContext.apiKeyName(),
                            "challenge": authRequest.challenge,
                            "response": this.prepareResponse(authRequest.challenge)
                        }))
                    });

                    $.ajax({
                        type: 'POST',
                        url: oauthSource,
                        data: data,
                        headers: {
                            grant_type: 'client_credentials'
                        }
                    }).done((results, status, xhr) => {
                        oauthContext.authHeader("Bearer " + results.replace(/(\r\n|\n|\r)/gm,""));
                        this.retryOriginalRequest(task, originalArguments);
                    }).fail((request, status, error) => {
                        task.reject(request, status, error);
                    });
                }
            });
    }

    retryOriginalRequest(task: JQueryDeferred<any>, orignalArguments: IArguments) {
        this.ajax.apply(this, orignalArguments).done((results, status, xhr) => {
            task.resolve(results, status, xhr);
        }).fail((request, status, error) => {
                task.reject(request, status, error);
        });
    }

    prepareResponse(challenge: string) {
        var input = challenge + ";" + oauthContext.apiKeySecret();
        var md = forge.md.sha1.create();
        md.update(input);
        return forge.util.encode64(md.digest().getBytes());
    }

    objectToString(input: any) {
        return $.map(input, (value, key) => key + "=" + value).join(',');
    }

    base64ToBigInt(input) {
        input = forge.util.decode64(input);
        var hex = forge.util.bytesToHex(input);
        return new forge.jsbn.BigInteger(hex, 16);
    }

    encryptAsymmetric(exponent, modulus, data) {
        var e = this.base64ToBigInt(exponent);
        var n = this.base64ToBigInt(modulus);
        var rsa = forge.pki.rsa;
        var publicKey = rsa.setPublicKey(n, e);

        var key = forge.random.getBytesSync(32);
        var iv = forge.random.getBytesSync(16);

        var keyAndIvEncrypted = publicKey.encrypt(key + iv, 'RSA-OAEP');

        var cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({ iv: iv });
        cipher.update(forge.util.createBuffer(data));
        cipher.finish();
        var encrypted = cipher.output;
        return forge.util.encode64(keyAndIvEncrypted + encrypted.data);
	}

    private static showSpin(timeToAlert:number) {
        ko.postbox.publish("LoadProgress", alertType.warning);
        commandBase.splashTimerHandle = setTimeout(commandBase.showServerNotRespondingAlert, timeToAlert);
    }

    private static showServerNotRespondingAlert() {
        ko.postbox.publish("LoadProgress", alertType.danger);
    }

    private static hideSpin() {
        ko.postbox.publish("LoadProgress", null);
    }

    private reportProgress(type: alertType, title: string, details?: string, httpStatusText?: string) {
        ko.postbox.publish("Alert", new alertArgs(type, title, details, httpStatusText));
    }
}

export = commandBase;