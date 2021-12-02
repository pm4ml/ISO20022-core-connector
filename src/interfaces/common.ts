
export interface IExtensionItem {
    key: string,
    value: string,
}
export interface IErrorInformation {
    errorCode: string,
    errorDescription: string,
    extensionList?: Array<IExtensionItem>
}

export interface IErrorResponse {
    statusCode: string,
    message: string,
}
