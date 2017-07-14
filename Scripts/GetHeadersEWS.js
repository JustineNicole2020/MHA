/**
 * GetHeaderEWS.js
 * 
 * This file has all the methods to get PR_TRANSPORT_MESSAGE_HEADERS
 * from the current message via EWS.
 * 
 * To use this file, your page JS needs to implement the following methods:
 * 
 * - updateStatus(message): Should be a method that displays a status to the user,
 *   preferably with some sort of activity indicator (spinner)
 * - hideStatus: Method to hide the status displays
 * - showError(message): Method to communicate an error to the user.
 * - getHeadersComplete(headers): Callback to receive headers.
 */

function sendHeadersRequest() {
    updateStatus(ImportedStrings.mha_RequestSent);

    var mailbox = Office.context.mailbox;
    var request = getHeadersRequest(mailbox.item.itemId);
    var envelope = getSoapEnvelope(request);

    try {
        viewModel.diagnostics += "Requirement set = " + getRequirementSet() + "\n";
        viewModel.diagnostics += "hostname = " + Office.context.mailbox.diagnostics.hostName + "\n";
        viewModel.diagnostics += "hostVersion = " + Office.context.mailbox.diagnostics.hostVersion + "\n";
        if (Office.context.mailbox.diagnostics.OWAView) {
            viewModel.diagnostics += "OWAView = " + Office.context.mailbox.diagnostics.OWAView + "\n";
        }

        viewModel.diagnostics += "itemType = " + Office.context.mailbox.item.itemType + "\n";

        viewModel.diagnostics += "contentLanguage = " + Office.context.contentLanguage + "\n";
        viewModel.diagnostics += "displayLanguage = " + Office.context.displayLanguage + "\n";
        viewModel.diagnostics += "touchEnabled = " + Office.context.touchEnabled + "\n";

        mailbox.makeEwsRequestAsync(envelope, callback);
    } catch (e) {
        showError(ImportedStrings.mha_requestFailed);
    }
}

// Function called when the EWS request is complete.
function callback(asyncResult) {
    // Process the returned response here.
    if (asyncResult.value) {
        viewModel.originalHeaders = asyncResult.value;
        var prop = null;
        try {
            var response = $.parseXML(asyncResult.value);
            var responseDom = $(response);

            if (responseDom) {
                //// See http://stackoverflow.com/questions/853740/jquery-xml-parsing-with-namespaces
                //// See also http://www.steveworkman.com/html5-2/javascript/2011/improving-javascript-xml-node-finding-performance-by-2000
                // We can do this because we know there's only the one property.
                prop = responseDom.filterNode("t:ExtendedProperty")[0];
            }
        } catch (e) {
        }

        if (prop) {
            getHeadersComplete(prop.textContent);
        } else {
            updateStatus(ImportedStrings.mha_requestFailed);
            $("#originalHeaders").text(viewModel.originalHeaders);
        }
    } else if (asyncResult.error) {
        showError(asyncResult.error.message);
    }

    hideStatus();
}

function getSoapEnvelope(request) {
    // Wrap an Exchange Web Services request in a SOAP envelope.
    var result =
        "<?xml version='1.0' encoding='utf-8'?>" +
        "<soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'" +
        "               xmlns:t='http://schemas.microsoft.com/exchange/services/2006/types'>" +
        "  <soap:Header>" +
        "     <t:RequestServerVersion Version='Exchange2013'/>" +
        "  </soap:Header>" +
        "  <soap:Body>" +
        request +
        "  </soap:Body>" +
        "</soap:Envelope>";

    return result;
}

function getHeadersRequest(id) {
    // Return a GetItem EWS operation request for the headers of the specified item.
    var result =
        "    <GetItem xmlns='http://schemas.microsoft.com/exchange/services/2006/messages'>" +
        "      <ItemShape>" +
        "        <t:BaseShape>IdOnly</t:BaseShape>" +
        "        <t:BodyType>Text</t:BodyType>" +
        "        <t:AdditionalProperties>" +
        // PR_TRANSPORT_MESSAGE_HEADERS
        "            <t:ExtendedFieldURI PropertyTag='0x007D' PropertyType='String' />" +
        "        </t:AdditionalProperties>" +
        "      </ItemShape>" +
        "      <ItemIds><t:ItemId Id='" + id + "'/></ItemIds>" +
        "    </GetItem>";

    return result;
}

// This function plug in filters nodes for the one that matches the given name.
// This sidesteps the issues in jquery's selector logic.
(function ($) {
    $.fn.filterNode = function (node) {
        return this.find("*").filter(function () {
            return this.nodeName === node;
        });
    };
})(jQuery);

function getRequirementSet() {
    if (Office.context.requirements && Office.context.requirements.isSetSupported) {
        if (Office.context.requirements.isSetSupported("Mailbox", 1.6)) return "1.6";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.5)) return "1.5";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.4)) return "1.4";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.3)) return "1.3";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.2)) return "1.2";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.1)) return "1.1";
        if (Office.context.requirements.isSetSupported("Mailbox", 1.0)) return "1.0";
    }

    if (Office.context.mailbox.addHandlerAsync) return "1.5?";
    if (Office.context.ui.displayDialogAsync) return "1.4?";
    if (Office.context.mailbox.item.saveAsync) return "1.3?";
    if (Office.context.mailbox.item.setSelectedDataAsync) return "1.2?";
    if (Office.context.mailbox.item.removeAttachmentAsync) return "1.1?";
    return "1.0?";
}