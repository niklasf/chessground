var util = require('./util');
var board = require('./board');
var drag = require('./drag');
var util = require('./util');

function pieceClass(p) {
  return ['cg-piece', p.role, p.color].join(' ');
}

function renderPiece(ctrl, key, p) {
  var attrs = {
    style: {},
    class: pieceClass(p)
  };
  var draggable = ctrl.data.draggable.current;
  if (draggable.orig === key && (draggable.pos[0] !== 0 || draggable.pos[1] !== 0)) {
    attrs.style[util.transformProp()] = util.translate([
      draggable.pos[0] + draggable.dec[0],
      draggable.pos[1] + draggable.dec[1]
    ]);
    attrs.class += ' dragging';
  } else if (ctrl.data.animation.current.anims) {
    var animation = ctrl.data.animation.current.anims[key];
    if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
  }
  return {
    tag: 'div',
    attrs: attrs
  };
}

function renderGhost(p) {
  return {
    tag: 'div',
    attrs: {
      class: pieceClass(p) + ' ghost'
    }
  };
}

function renderSquare(ctrl, pos, asWhite) {
  var file = util.files[pos[0] - 1];
  var rank = pos[1];
  var key = file + rank;
  var piece = ctrl.data.pieces[key];
  var isDragOver = ctrl.data.highlight.dragOver && ctrl.data.draggable.current.over === key;
  var attrs = {
    class: 'cg-square ' + key + ' ' + util.classSet({
      'selected': ctrl.data.selected === key,
      'check': ctrl.data.highlight.check && ctrl.data.check === key,
      'last-move': ctrl.data.highlight.lastMove && util.contains2(ctrl.data.lastMove, key),
      'move-dest': (isDragOver || ctrl.data.movable.showDests) && util.containsX(ctrl.data.movable.dests[ctrl.data.selected], key),
      'premove-dest': (isDragOver || ctrl.data.premovable.showDests) && util.containsX(ctrl.data.premovable.dests, key),
      'current-premove': util.contains2(ctrl.data.premovable.current, key),
      'drag-over': isDragOver,
      'occupied': !!piece
    }),
    style: {
      left: (asWhite ? pos[0] - 1 : 8 - pos[0]) * 12.5 + '%',
      bottom: (asWhite ? pos[1] - 1 : 8 - pos[1]) * 12.5 + '%'
    }
  };
  if (pos[1] === (asWhite ? 1 : 8)) attrs['data-coord-x'] = file;
  if (pos[0] === (asWhite ? 8 : 1)) attrs['data-coord-y'] = rank;
  var children = [];
  if (piece) {
    children.push(renderPiece(ctrl, key, piece));
    if (ctrl.data.draggable.current.orig === key && ctrl.data.draggable.showGhost) {
      children.push(renderGhost(piece));
    }
  }
  return {
    tag: 'div',
    attrs: attrs,
    children: children
  };
}

function renderSquareTarget(cur) {
  var pos = util.key2pos(cur.over);
  return {
    tag: 'div',
    attrs: {
      id: 'cg-square-target',
      style: {
        width: cur.bounds.width / 4 + 'px',
        height: cur.bounds.height / 4 + 'px',
        left: (pos[0] - 1.5) * cur.bounds.width / 8 + 'px',
        top: (7.5 - pos[1]) * cur.bounds.height / 8 + 'px'
      }
    }
  };
}

function renderFading(cfg) {
  return {
    tag: 'div',
    attrs: {
      class: 'cg-square fading',
      style: {
        left: cfg.left,
        bottom: cfg.bottom,
        opacity: cfg.opacity
      }
    },
    children: {
      tag: 'div',
      attrs: {
        class: pieceClass(cfg.piece)
      }
    }
  };
}

function renderContent(ctrl) {
  var asWhite = ctrl.data.orientation == 'white';
  var children = (asWhite ? util.allPos : util.invPos).map(function(pos) {
    return renderSquare(ctrl, pos, asWhite);
  });
  if (ctrl.data.draggable.current.over && ctrl.data.draggable.squareTarget)
    children.push(renderSquareTarget(ctrl.data.draggable.current));
  if (ctrl.data.animation.current.fadings)
    ctrl.data.animation.current.fadings.forEach(function(p) {
      children.push(renderFading(p));
    });
  return children;
}

function renderBoard(ctrl) {
  return {
    tag: 'div',
    attrs: {
      class: 'cg-board orientation-' + ctrl.data.orientation,
      config: function(el, isUpdate, context) {
        if (isUpdate) return;
        var isTouch = util.isTouchDevice();
        var onstart = util.partial(drag.start, ctrl.data);
        var onmove = util.partial(drag.move, ctrl.data);
        var onend = util.partial(drag.end, ctrl.data);
        el.addEventListener(isTouch ? 'touchstart' : 'mousedown', onstart);
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onmove);
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onend);
        context.onunload = function() {
          el.removeEventListener(isTouch ? 'touchstart' : 'mousedown', onstart);
          document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onmove);
          document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onend);
        };
        // this function only repaints the board itself.
        // it's called when dragging or animating pieces,
        // to prevent the full application embedding chessground
        // rendering on every animation frame
        ctrl.data.render = function() {
          m.render(el, renderContent(ctrl));
        };
        ctrl.data.renderRAF = function() {
          requestAnimationFrame(ctrl.data.render);
        };
        ctrl.data.bounds = el.getBoundingClientRect.bind(el);
        ctrl.data.element = el;
        ctrl.data.render();
      }
    },
    children: null
  };
}

module.exports = renderBoard;
