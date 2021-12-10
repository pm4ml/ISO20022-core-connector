import { AxiosInstance, AxiosResponse } from "axios";
import { MockedObjectDeep } from "ts-jest/dist/utils/testing";
import { InboundRequester, OutboundRequester, RequesterOptions } from "../../requests";

export const defaultResponse = {
  data: '',
  status: 200,
  statusText: 'OK',
  config: {},
  headers: {},
} as AxiosResponse;


export type MockedInboundRequesterHelperOps = {
  sendPACS008toReceiverBackendResponse?: AxiosResponse | Error;
  sendPACS002toSenderBackendResponse?: AxiosResponse | Error;
  acceptBackendTransfersResponse?: AxiosResponse | Error;
  sendTransfersErrorResponse?: AxiosResponse | Error;
}

export const mockInboundRequesterHelper = (requester: MockedObjectDeep<any>, ops: MockedInboundRequesterHelperOps = {}): MockedObjectDeep<InboundRequester> => {
  const defaultOps = {
      sendPACS008toReceiverBackendResponse: ops?.sendPACS008toReceiverBackendResponse || defaultResponse,
      sendPACS002toSenderBackendResponse: ops?.sendPACS002toSenderBackendResponse || defaultResponse,
      acceptBackendTransfersResponse: ops?.acceptBackendTransfersResponse || defaultResponse,
      sendTransfersErrorResponse: ops?.sendTransfersErrorResponse || defaultResponse,
  }
  // Mock InboundRequester implementation
  // ts-ignore required as typescript does not like these mocks
  // @ts-ignore
  return requester.mockImplementation(() => {
      return {
          options: {} as RequesterOptions,
          axiosInstance:  {} as AxiosInstance,
          // ts-ignore required as typescript does like unused params
          // @ts-ignore
          sendPACS008toReceiverBackend: jest.fn().mockImplementation((params: IPartiesByIdParams): Promise<AxiosResponse<any>> => {
              if (defaultOps.sendPACS008toReceiverBackendResponse instanceof Error) throw defaultOps.sendPACS008toReceiverBackendResponse;
              return Promise.resolve(defaultOps.sendPACS008toReceiverBackendResponse);
          }),
          // ts-ignore required as typescript does like unused params
          // @ts-ignore
          sendPACS002toSenderBackend: jest.fn().mockImplementation((postQuotesBody: IPostQuotesBody): Promise<AxiosResponse<any>> => {
              if (defaultOps.sendPACS002toSenderBackendResponse instanceof Error) throw defaultOps.sendPACS002toSenderBackendResponse;
              return Promise.resolve(defaultOps.sendPACS002toSenderBackendResponse);
          }),
          // ts-ignore required as typescript does like unused params
          // @ts-ignore
          acceptBackendTransfers: jest.fn().mockImplementation((transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => {
              if (defaultOps.acceptBackendTransfersResponse instanceof Error) throw defaultOps.acceptBackendTransfersResponse;
              return Promise.resolve(defaultOps.acceptBackendTransfersResponse);
          }),
          // ts-ignore required as typescript does like unused params
          // @ts-ignore
          sendTransfersError: jest.fn().mockImplementation((transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => {
              if (defaultOps.sendTransfersErrorResponse instanceof Error) throw defaultOps.sendTransfersErrorResponse;
              return Promise.resolve(defaultOps.sendTransfersErrorResponse);
          }),
      }
  });
}

export type MockedOutboundRequesterHelperOps = {
  getPartiesResponse?: AxiosResponse | Error;
  requestQuotesResponse?: AxiosResponse | Error;
  acceptQuotesResponse?: AxiosResponse | Error;
}

export const mockOutboundRequesterHelper = (requester: MockedObjectDeep<any>, ops: MockedOutboundRequesterHelperOps = {}): MockedObjectDeep<OutboundRequester> => {
  const defaultOps = {
      getPartiesResponse: ops?.getPartiesResponse || defaultResponse,
      requestQuotesResponse: ops?.requestQuotesResponse || defaultResponse,
      acceptQuotesResponse: ops?.acceptQuotesResponse || defaultResponse,
  }

  // const appliedOps = { ...MockedOutboundRequesterHelperOpsDefault, ops}

  // Mock OutboundRequester implementation
  // ts-ignore required as typescript does not like these mocks
  // @ts-ignore
  return requester.mockImplementation(() => {
      return {
          options: {} as RequesterOptions,
          axiosInstance:  {} as AxiosInstance,
          // @ts-ignore
          getParties: jest.fn().mockImplementation((params: IPartiesByIdParams): Promise<AxiosResponse<any>> => {
              if (defaultOps.getPartiesResponse instanceof Error) throw defaultOps.getPartiesResponse;
              return Promise.resolve(defaultOps.getPartiesResponse);
          }),
          // @ts-ignore
          requestQuotes: jest.fn().mockImplementation((postQuotesBody: IPostQuotesBody): Promise<AxiosResponse<any>> => {
              if (defaultOps.requestQuotesResponse instanceof Error) throw defaultOps.requestQuotesResponse;
              return Promise.resolve(defaultOps.requestQuotesResponse);
          }),
          // @ts-ignore
          acceptQuotes: jest.fn().mockImplementation((transferId: string, acceptQuotesBody: ITransferContinuationQuote): Promise<AxiosResponse<any>> => {
              if (defaultOps.acceptQuotesResponse instanceof Error) throw defaultOps.acceptQuotesResponse;
              return Promise.resolve(defaultOps.acceptQuotesResponse);
          }),
      }
  });
}
