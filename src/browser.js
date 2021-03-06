import React from 'react';
import { Link } from 'react-router';
import toReactElement from 'jsonml-to-react-element';
import JsonML from 'jsonml.js/lib/utils';
import VideoPlayer from './VideoPlayer';
import ImagePreview from './ImagePreview';

function isHeading(node) {
  return /h[1-6]/i.test(JsonML.getTagName(node));
}

function isZhCN(pathname) {
  return /-cn\/?$/.test(pathname);
}

function makeSureComonentsLink(pathname) {
  const pathSnippets = pathname.split('#');
  if (pathSnippets[0].indexOf('/components') > -1 && !pathSnippets[0].endsWith('/')) {
    pathSnippets[0] = `${pathSnippets[0]}/`;
  }
  return pathSnippets.join('#');
}

function toZhCNPathname(pathname) {
  if (/-cn.html\/?$/.test(pathname)) {
    return makeSureComonentsLink(pathname);
  }
  const pathSnippets = pathname.split('#');
  pathSnippets[0] = `${pathSnippets[0].replace(/\/$/, '')}-cn`;
  return makeSureComonentsLink(pathSnippets.join('#'));
}

function generateSluggedId(children) {
  const headingText = children.map((node) => {
    if (JsonML.isElement(node)) {
      if (JsonML.hasAttributes(node)) {
        return node[2] || '';
      }
      return node[1] || '';
    }
    return node;
  }).join('');
  const sluggedId = headingText.trim().replace(/\s+/g, '-');
  return sluggedId;
}

// export default doesn't work
module.exports = (_, props) =>
   ({
     converters: [
       [node => JsonML.isElement(node) && isHeading(node), (node, index) => {
         const children = JsonML.getChildren(node);
         const sluggedId = generateSluggedId(children);
         return React.createElement(JsonML.getTagName(node), {
           key: index,
           id: sluggedId,
           ...JsonML.getAttributes(node),
         }, [
           <span key="title">{children.map(child => toReactElement(child))}</span>,
           <a href={`#${sluggedId}`} className="anchor" key="anchor">#</a>,
         ]);
       }],
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'video', (node, index) =>
         <VideoPlayer video={JsonML.getAttributes(node)} key={index} />,
       ],
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'a' && (
         JsonML.getAttributes(node).class ||
         (JsonML.getAttributes(node).href &&
         JsonML.getAttributes(node).href.indexOf('http') === 0)
       ), (node, index) => { // 对以http开头的外链做处理
         const href = JsonML.getAttributes(node).href;
         let title = JsonML.getAttributes(node).title;
         const target = (title && title.indexOf('target=') > -1) ? title.split('=')[1] : null;
         title = (title && title.indexOf('target=') > -1) ? null : title;

         return (
           <a
             href={href}
             key={index}
             target={target}
             title={title} >
             {toReactElement(JsonML.getChildren(node)[0])}
           </a>
         );
       }],
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'a' && !(
        JsonML.getAttributes(node).class ||
          (JsonML.getAttributes(node).href &&
           JsonML.getAttributes(node).href.indexOf('http') === 0) ||
          /^#/.test(JsonML.getAttributes(node).href)
       ), (node, index) => { // 对不以http和#开头的站内链接做处理
         const href = JsonML.getAttributes(node).href;

         // https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/Link.js
         const title = JsonML.getAttributes(node).title;
         const target = (title && title.indexOf('target=') > -1) ? title.split('=')[1] : null;

         return (
           <Link
             to={isZhCN(props.location.pathname) ? toZhCNPathname(href) : makeSureComonentsLink(href)}
             key={index}
             target={target} >
             {toReactElement(JsonML.getChildren(node)[0])}
           </Link>
         );
       }],
       [node =>
         JsonML.isElement(node) &&
          JsonML.getTagName(node) === 'p' &&
          JsonML.getTagName(JsonML.getChildren(node)[0]) === 'img' &&
          /preview-img/gi.test(JsonML.getAttributes(JsonML.getChildren(node)[0]).class),
         (node, index) => {
           const imgs = JsonML.getChildren(node)
                .filter(img => JsonML.isElement(img) && Object.keys(JsonML.getAttributes(img)).length > 0)
                .map(img => JsonML.getAttributes(img));
           return <ImagePreview imgs={imgs} key={index} />;
         }],
     ],
   })
;
