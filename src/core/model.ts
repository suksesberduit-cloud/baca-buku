export type BlockKind='heading'|'paragraph'|'quote'|'caption'|'image'
export interface Block{id:string;kind:BlockKind;text:string;hash:string;src?:string}
export interface Chapter{id:string;title:string;blocks:Block[]}
export interface Book{id:string;title:string;author:string;toc:string[];addedAt:number;cover?:string}
export type ImgEntry=[string,{type:string;data:ArrayBuffer}]
