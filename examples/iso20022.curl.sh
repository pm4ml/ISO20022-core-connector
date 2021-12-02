curl --location --request POST 'http://localhost:3003/outbound/iso20022' \
--header 'Content-Type: application/xml' \
--data-raw '<?xml version="1.0" encoding="utf-8"?>
<!-- POST /transfers -->
<Document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.09">
    <FIToFICstmrCdtTrf>
        <GrpHdr>
            <MsgId>7e2599df-80a1-4f6e-b381-99536c4d2691</MsgId>     <!-- This is The transaction ID -->
            <CreDtTm>2021-02-10T15:07:38.6875000+03:00</CreDtTm>    <!-- Required by ISO, not used by Moja -->
            <NbOfTxs>1</NbOfTxs>                                    <!-- One transaction -->
            <SttlmInf>
                <SttlmMtd>CLRG</SttlmMtd>
            </SttlmInf>
            <PmtTpInf>
                <CtgyPurp>
                    <Cd>code</Cd>
                </CtgyPurp>
            </PmtTpInf>
        </GrpHdr>
        <CdtTrfTxInf>
            <PmtId>                                              
              <InstrId>8c5d9f95</InstrId>
              <EndToEndId>0120a604-aa80-43da-b6f6-c1d5f8aa622e</EndToEndId> <!-- This is the transfer ID  -->
              <TxId>acd1ef76</TxId>
            </PmtId>
            <Cndtn>
                <Condition>fH9pAYDQbmoZLPbvv3CSW2RfjU4jvM4ApG_fqGnR7Xs</Condition>
            </Cndtn>
            <IntrBkSttlmAmt Ccy="RWF">20200</IntrBkSttlmAmt>
            <IntrBkSttlmDt>2021-07-13</IntrBkSttlmDt>
            <ChrgBr>DEBT</ChrgBr>                                       <!-- Amount is the amount the creditor will receive... -->
           <InitgPty>
                <Nm>LAKE CITY BANK</Nm>
                <Id>
                    <OrgId>
                        <Othr>
                            <Id>INITGPTY_ID</Id>
                        </Othr>
                    </OrgId>
                </Id>
           </InitgPty>
           <Dbtr>
                <Nm>PAYER_NAME</Nm>
                <CtctDtls>
                    <MobNb>+1-574-265-1752</MobNb>	                    <!-- Debtor is identified by a mobile number -->
                </CtctDtls>
            </Dbtr>
            <DbtrAcct>
                <Id>
                    <Othr>
                        <Id>+1-574-265-1752</Id>
                    </Othr>
                </Id>
            </DbtrAcct>
            <DbtrAgt>
				<FinInstnId>
					<BICFI>LAKCUS33</BICFI>
					<Nm>LAKE CITY BANK</Nm>	                            <!-- Included for information - not required by ISO or Moja -->
                    <Othr>
                        <Id>LAKCUS33</Id>
                    </Othr>
				</FinInstnId>
            </DbtrAgt>
            <CdtrAgt>
                <FinInstnId>
                    <BICFI>EQBLRWRWXXX</BICFI>
                    <Nm>EQUITY BANK RWANDA LIMITED</Nm>	                <!-- Creditor'\''s DFSP -->
                    <Othr>
                        <Id>EQBLRWRWXXX</Id>
                    </Othr>
                </FinInstnId>
            </CdtrAgt>
           <Cdtr>
                <Nm>PAYEE_NAME</Nm>
                <CtctDtls>
                    <MobNb>+250-70610388</MobNb>	                    <!-- Creditor is identified by a mobile number -->
                </CtctDtls>
            </Cdtr>
            <CdtrAcct>
                <Id>
                    <Othr>
                        <Id>+250-70610388</Id>
                    </Othr>
                </Id>
            </CdtrAcct>
           <RmtInf>
                <Ustrd>d7d91837-4402-4c8f-9b73-20255b0ec40c</Ustrd>
                <Strd>
                    <RfrdDocInf>
                        <Nb>hsuikdfgdgg</Nb>
                        <RltdDt>2021-07-13</RltdDt>
                    </RfrdDocInf>
                </Strd>
           </RmtInf>
        </CdtTrfTxInf>
    </FIToFICstmrCdtTrf>
</Document>'