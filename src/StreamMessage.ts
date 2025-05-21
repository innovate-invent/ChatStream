export enum MessageAction {
    New,
    Update,
    Delete,
}

export interface StreamMessage {
    timestamp: number
    userName: string
    //userBadgeUrl: string
    message: string
    id: string
    source: string
    action: MessageAction,
}