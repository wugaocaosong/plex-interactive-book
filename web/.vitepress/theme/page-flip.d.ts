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
    destroy():void;
  }
}
