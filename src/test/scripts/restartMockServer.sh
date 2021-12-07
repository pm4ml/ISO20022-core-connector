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
docker run --rm --network host byrnedo/alpine-curl -X PUT "http://localhost:1080/expectation" -d '{ "httpRequest": { "method": ".*", "path": "/backend.*" }, "times" : { "remainingTimes" : 0,	"unlimited" : true }, "timeToLive" : { "unlimited" : true }, "httpResponse": { "statusCode": 200, "headers": { "Content-Type": ["application/xml"] }, "body": "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<Document xmlns:xsi=\"http:\/\/www.w3.org\/2001\/XMLSchema-instance\"\r\n  xmlns=\"urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10\">\r\n  <FIToFIPmtStsRpt>\r\n    <GrpHdr>\r\n      <MsgId>RNDPS\/4e9b19494e5f0c7d61a607<\/MsgId>\r\n      <CreDtTm>2021-12-03T14:09:39.288Z<\/CreDtTm>\r\n    <\/GrpHdr>\r\n    <TxInfAndSts>\r\n      <OrgnlInstrId>8c5d9f95<\/OrgnlInstrId>\r\n      <OrgnlEndToEndId>ABC/0404/2019-10-10<\/OrgnlEndToEndId>\r\n      <OrgnlTxId>acd1ef76<\/OrgnlTxId>\r\n      <TxSts>PNDG<\/TxSts>\r\n    <\/TxInfAndSts>\r\n  <\/FIToFIPmtStsRpt>\r\n<\/Document>\r\n" } }';

echo "${MOCKSERVER_ID} ready to accept requests..."
