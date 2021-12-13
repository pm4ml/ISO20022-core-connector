#!/usr/bin/env bash
echo "---------------------------------------------------------------------"
echo "Starting MockServer Restart Script..."
echo "---------------------------------------------------------------------"
echo

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi

echo "Loading env vars..."
source $CWD/env.sh

echo
echo "---------------------------------------------------------------------"
echo " Creating MockServer Instance"
echo "---------------------------------------------------------------------"

echo
echo "Destroying MockServer ${MOCKSERVER_ID}"

docker stop $MOCKSERVER_ID
docker rm $MOCKSERVER_ID

echo "Starting Docker ${MOCKSERVER_ID}{default} with binding 1080:1080"
docker run --name ${MOCKSERVER_ID} -d -p 1080:1080 jamesdbloom/mockserver;

is_service_up() {
  docker run --rm --network host byrnedo/alpine-curl -s -X PUT "http://localhost:1080/status" -d '{"method": "*", "path": "*"}' > /dev/null 2>&1
}

echo "Waiting for mockserver to start"
while true; do
  sleep $SLEEP_FACTOR_IN_SECONDS
  if is_service_up; then break; fi
  printf "."
done

echo
echo "Configuring expectation for mockserver"
# Mock the ML-Connector for the Outgoing responses for the Sender-side
docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": "POST", "path": "/outbound/transfers" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/json"] }, "body": "{\r\n    \"currentState\": \"WAITING_FOR_QUOTE_ACCEPTANCE\",\r\n    \"transferId\": \"0120a604-aa80-43da-b6f6-c1d5f8aa622e\"\r\n}" } }';
docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": "PUT", "path": "/outbound/transfers.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/json"] }, "body": "{\r\n    \"currentState\": \"COMPLETED\",\r\n    \"transferId\": \"0120a604-aa80-43da-b6f6-c1d5f8aa622e\",\r\n    \"quoteRequestExtensions\": [\r\n        {\r\n            \"key\": \"MSGID\",\r\n            \"value\": \"RNDPS\/4e9b19494e5f0c7d61a607\"\r\n        },\r\n        {\r\n            \"key\": \"INSTRID\",\r\n            \"value\": \"8c5d9f95\"\r\n        },\r\n        {\r\n            \"key\": \"TXID\",\r\n            \"value\": \"acd1ef76\"\r\n        },\r\n        {\r\n            \"key\": \"ENDTOENDID\",\r\n            \"value\": \"000400078911122\"\r\n        }\r\n    ]\r\n}\r\n" } }';

# Mock Receiver Backend
# docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/backend.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/xml"] }, "body": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<Document xmlns:xsi=\"http:\/\/www.w3.org\/2001\/XMLSchema-instance\"\r\n  xmlns=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10\">\r\n  <FIToFIPmtStsRpt>\r\n    <GrpHdr>\r\n      <MsgId>RNDPS\/4e9b19494e5f0c7d61a607<\/MsgId>\r\n      <CreDtTm>2021-12-03T14:09:39.288Z<\/CreDtTm>\r\n    <\/GrpHdr>\r\n    <TxInfAndSts>\r\n      <OrgnlInstrId>8c5d9f95<\/OrgnlInstrId>\r\n      <OrgnlEndToEndId>ABC/0404/2019-10-10<\/OrgnlEndToEndId>\r\n      <OrgnlTxId>acd1ef76<\/OrgnlTxId>\r\n      <TxSts>PDNG<\/TxSts>\r\n    <\/TxInfAndSts>\r\n  <\/FIToFIPmtStsRpt>\r\n<\/Document>\r\n" } }';
# docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/backend.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/xml"] }, "body": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<BusinessMessage><Document xmlns:xsi=\"http:\/\/www.w3.org\/2001\/XMLSchema-instance\"\r\n  xmlns=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10\">\r\n  <FIToFIPmtStsRpt>\r\n    <GrpHdr>\r\n      <MsgId>RNDPS\/4e9b19494e5f0c7d61a607<\/MsgId>\r\n      <CreDtTm>2021-12-03T14:09:39.288Z<\/CreDtTm>\r\n    <\/GrpHdr>\r\n    <TxInfAndSts>\r\n      <OrgnlInstrId>8c5d9f95<\/OrgnlInstrId>\r\n      <OrgnlEndToEndId>ABC/0404/2019-10-10<\/OrgnlEndToEndId>\r\n      <OrgnlTxId>acd1ef76<\/OrgnlTxId>\r\n      <TxSts>PDNG<\/TxSts>\r\n    <\/TxInfAndSts>\r\n  <\/FIToFIPmtStsRpt>\r\n<\/Document></BusinessMessage>\r\n" } }';

docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/backend.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/xml"] }, "body": "<?xml version=\"1.0\"?>\n<BusinessMessage>\n  <AppHdr xmlns=\"urn:iso:std:iso:20022:tech:xsd:head.001.001.01\">\n    <ds:Signature xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\">\n      <ds:SignedInfo>\n        <ds:CanonicalizationMethod Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\n        <ds:SignatureMethod Algorithm=\"http://www.w3.org/2001/04/xmldsig-more#rsa-sha256\"/>\n        <ds:Reference URI=\"#bc1a906f-06cf-4dad-bd32-e0859e8377b9\">\n          <ds:Transforms>\n            <ds:Transform Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\n          </ds:Transforms>\n          <ds:DigestMethod Algorithm=\"http://www.w3.org/2001/04/xmlenc#sha256\"/>\n          <ds:DigestValue>tLc5WQc43KviX6qO2tq67R+XDzms/K95d1Gu1ppomHU=</ds:DigestValue>\n        </ds:Reference>\n        <ds:Reference URI=\"\">\n          <ds:Transforms>\n            <ds:Transform Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/>\n            <ds:Transform Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\n          </ds:Transforms>\n          <ds:DigestMethod Algorithm=\"http://www.w3.org/2001/04/xmlenc#sha256\"/>\n          <ds:DigestValue>cehRxP8BxyK5Xo+ozB3HDMQIlNBDLP5WAEo5sBLry4E=</ds:DigestValue>\n        </ds:Reference>\n        <ds:Reference>\n          <ds:Transforms>\n            <ds:Transform Algorithm=\"http://www.w3.org/2001/10/xml-exc-c14n#\"/>\n          </ds:Transforms>\n          <ds:DigestMethod Algorithm=\"http://www.w3.org/2001/04/xmlenc#sha256\"/>\n          <ds:DigestValue>ojFAuu/XQsxjAvrEqLM/5a6EYENNFe7zqTQZx6HWqdA=</ds:DigestValue>\n        </ds:Reference>\n      </ds:SignedInfo>\n      <ds:SignatureValue>uMuLaZ4TDrxrI+3ocZvNKywAGMkOHavDc0UDfieg+vKhowvRmxg1GRzBaRKHYFr31yAKddti0xca\n63YyCi6iGKZhJF4YkBnUjvirQJscQnbpSMO+BgDNb4aIulbZy2R+LoozX5NYQAmwmKA1qnmgg2zc\nBDeLGshNkcxciqHTZGOeD69HmSMyKw2+uZ12F5MLJViEKVbqz0ZAUbeTMjeIbR4W7NJN7cl63KCY\naK9D2udKHNKLfktr3i6793ACa8ZpegA+ZjUaQKuS/7Duvh9fdd7ECvs7Du0gDuCgXV6S6xpbrFPo\nCYOjqMEWakN/CQEUGYj9827dwXgsi9lErIrzTg==</ds:SignatureValue>\n      <ds:KeyInfo Id=\"bc1a906f-06cf-4dad-bd32-e0859e8377b9\">\n        <ds:KeyValue>\n          <ds:RSAKeyValue>\n            <ds:Modulus>uUFRZyRC6kM4HS5yS4tL8VhvnoWMxvu+yoCyiZXJEhcXqY0DY1hD2Dcy8NOOsprJ4dZlqxcqYZEq\nElC1q1IHmuZk4BVIMWqglZMKfVsYmYOSB0OrT1Crlhm/1y25IqTmDKISa2itHghFP/VXK8bkWQao\nd6MYOnnEjNFwPUGF+TPEEu5cFS/LNyET4QpxhY9ZzOszLLWXjbxksEpqtvIjj+COj/xgPTwzWcwv\nMmJm4f3o5b3Ez5GMHZK7AV1vi4Dt3UlbraFUWXSjMMZ4b3Jbjg3qGvDemNyLbZyoQGTkbT//3DOa\n2YLYyd8ncHjotuMjY8ihLK2gA17S0p8Sho622Q==</ds:Modulus>\n            <ds:Exponent>AQAB</ds:Exponent>\n          </ds:RSAKeyValue>\n        </ds:KeyValue>\n        <ds:X509Data>\n          <ds:X509Certificate>MIID/zCCAuegAwIBAgIBBTANBgkqhkiG9w0BAQsFADCBjDELMAkGA1UEBhMCUlcxDzANBgNVBAgT\nBktpZ2FsaTELMAkGA1UEBxMCUlcxEDAOBgNVBAoTB1JTd2l0Y2gxDzANBgNVBAsTBlItTkRQUzEW\nMBQGA1UEAxMNUi1ORFBTIFNVQiBDQTEkMCIGCSqGSIb3DQEJARYVaW5mb3NlY0Byc3dpdGNoLmNv\nLnJ3MB4XDTE5MTAwNzA4NTEwMFoXDTI0MTAwNzA4NTEwMFowgZwxCzAJBgNVBAYTAlJXMQ8wDQYD\nVQQIEwZLaWdhbGkxDzANBgNVBAcTBktpZ2FsaTEUMBIGA1UEChMLUlN3aXRjaCBMdGQxFjAUBgNV\nBAsTDUlUIERlcGFydG1lbnQxGjAYBgNVBAMTEUludGVncmF0aW9uIExheWVyMSEwHwYJKoZIhvcN\nAQkBFhJpbmZvQHJzd2l0Y2guY28ucncwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5\nQVFnJELqQzgdLnJLi0vxWG+ehYzG+77KgLKJlckSFxepjQNjWEPYNzLw046ymsnh1mWrFyphkSoS\nULWrUgea5mTgFUgxaqCVkwp9WxiZg5IHQ6tPUKuWGb/XLbkipOYMohJraK0eCEU/9VcrxuRZBqh3\noxg6ecSM0XA9QYX5M8QS7lwVL8s3IRPhCnGFj1nM6zMstZeNvGSwSmq28iOP4I6P/GA9PDNZzC8y\nYmbh/ejlvcTPkYwdkrsBXW+LgO3dSVutoVRZdKMwxnhvcluODeoa8N6Y3IttnKhAZORtP//cM5rZ\ngtjJ3ydweOi24yNjyKEsraADXtLSnxKGjrbZAgMBAAGjWjBYMAkGA1UdEwQCMAAwHQYDVR0OBBYE\nFBfCLyY6cAjbHtZ+5sOgrE+jbR2JMB8GA1UdIwQYMBaAFBA/2uMlpd8NUn2CZlXSrD6H/sMiMAsG\nA1UdDwQEAwIHgDANBgkqhkiG9w0BAQsFAAOCAQEATOUOuX+8U0MmZeY2sGZ6yMsSFtk4WGBpldSp\nOJh6PJqt68LoUdzEgPeVqI9r/WobmQxet6J04ILrMbkXqAXWN6bQ8yHEk7U6YP0CZuT3ti9yfKxK\nhXKym6f0/zcNvYzoa5Mi0XCMoX5iPFLSoBWvT8o7pDoX/m+xMkXlQGUsVu9b+ILudaz5lYXg2+tT\nol3fQWx5ccf/KeEEoTDthLWUOkLmwyTHHS1JDPc5tOMZvAY5epJbBwB6MeO6SF/5y+nmbW/O/iN9\nLKbtyZzKR5Li7c7+lvs61W3XezCuvgBzX6+R7QEH7RRL+fztfWdKp9cKEa62F9vudqkBbpxQMC88\n9Q==</ds:X509Certificate>\n        </ds:X509Data>\n      </ds:KeyInfo>\n    </ds:Signature>\n  </AppHdr>\n  <Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10 pacs.002.001.10.xsd\">\n    <FIToFIPmtStsRpt>\n      <GrpHdr>\n        <MsgId>RNDPS/4e9b19494e5f0c7d61a608</MsgId>\n        <CreDtTm>2021-12-07T19:00:15.030Z</CreDtTm>\n      </GrpHdr>\n      <TxInfAndSts>\n        <OrgnlInstrId>8c5d9f96</OrgnlInstrId>\n        <OrgnlEndToEndId>ABC/1414/2019-10-11</OrgnlEndToEndId>\n        <OrgnlTxId>acd1ef76</OrgnlTxId>\n        <TxSts>PDNG</TxSts>\n      </TxInfAndSts>\n    </FIToFIPmtStsRpt>\n  </Document>\n</BusinessMessage>" } }';


echo "${MOCKSERVER_ID} ready to accept requests..."
