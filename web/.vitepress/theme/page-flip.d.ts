declare module 'page-flip' {
  export class PageFlip {
    constructor(element: HTMLElement, settings: {
      width:number; height:number; size?:'fixed'|'stretch'; usePortrait?:boolean; autoSize?:boolean;
      showCover?:boolean; startPage?:number; drawShadow?:boolean; maxShadowOpacity?:number;
      flippingTime?:number; useMouseEvents?:boolean; mobileScrollSupport?:boolean; disableFlipByClick?:boolean;
    });
    on(event:string, callback:(event:{data:number|string|Record<string,unknown>})=>void):void;
    loadFromHTML(elements:HTMLElement[]):void;
    turnToPage(index:number):void;
    flipNext():void;
    flipPrev():void;
    getCurrentPageIndex():number;
    getUI():{getDistElement():HTMLElement};
    getState():'read'|'user_fold'|'fold_corner'|'flipping';
    getOrientation():'portrait'|'landscape';
    getBoundsRect():{left:number;top:number;width:number;height:number;pageWidth:number};
    getFlipController():{start(point:{x:number;y:number}):boolean;fold(point:{x:number;y:number}):void};
    startUserTouch(point:{x:number;y:number}):void;
    userMove(point:{x:number;y:number},isTouch:boolean):void;
    userStop(point:{x:number;y:number},isSwipe?:boolean):void;
    destroy():void;
  }
}
