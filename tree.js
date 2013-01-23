module.exports = Tree

var aabb = require('aabb-3d')

function Tree(size, bbox, parent) {
  this.listeners = {}
  this.size = size
  this.bbox = bbox
  this.parent = parent
  this.children = []
}

var cons = Tree
  , proto = cons.prototype

proto.add = function(event, bbox, listener) {
  if(!this.parent && !this.contains(bbox)) {
    return this.expand(bbox).add(event, bbox, listener)
  }

  for(var i = 0, len = this.children.length; i < len; ++i) {
    if(this.children[i].contains(bbox)) {
      return this.children[i].add(event, bbox, listener)
    }
  }

  var size = this.size / 2

  if(size > this.min_size && bbox.vec[0] < size && bbox.vec[1] < size && bbox.vec[2] < size) {
    // if it fits into a child node, make that childnode
    if(Math.floor(bbox.x0() / size) === Math.floor(bbox.x1() / size) &&
       Math.floor(bbox.y0() / size) === Math.floor(bbox.y1() / size) &&
       Math.floor(bbox.z0() / size) === Math.floor(bbox.z1() / size)) {
      this.children.push(new this.constructor(
        size
      , aabb([
            Math.floor(bbox.x0() / size) * size
          , Math.floor(bbox.y0() / size) * size
          , Math.floor(bbox.z0() / size) * size
          ]
        , [size, size, size]
        )
      , this
      ))

      return this.children[this.children.length - 1].add(event, bbox, listener)
    }
  }

  (this.listeners[event] = this.listeners[event] || [])
    .push({bbox: bbox, func: listener})
}

proto.contains = function(bbox) {
  return bbox.x0() >= this.bbox.x0() &&
         bbox.y0() >= this.bbox.y0() &&
         bbox.z0() >= this.bbox.z0() &&
         bbox.x1() <= this.bbox.x1() &&
         bbox.y1() <= this.bbox.y1() &&
         bbox.z1() <= this.bbox.z1()
}

proto.expand = function(bbox) {
  var new_size = this.size * 2
    , expanded = this.bbox.expand(bbox)
    , new_base = [
        bbox.x0() - this.bbox.x0() > 0 ? this.bbox.x0() : this.bbox.x0() - this.size
      , bbox.y0() - this.bbox.y0() > 0 ? this.bbox.y0() : this.bbox.y0() - this.size
      , bbox.z0() - this.bbox.z0() > 0 ? this.bbox.z0() : this.bbox.z0() - this.size
      ]
    , new_bbox = aabb(new_base, [new_size, new_size, new_size])
    , new_root = new this.constructor(new_size, new_bbox)
    , self = this


  this.parent = new_root
  this.grow(this.parent)

  new_root.children.push(self)

  return new_root
}

proto.remove = function(event, listener) {
  var list = this.listeners[event]
  if(list) {
    for(var i = 0, len = list.length; i < len; ++i) {
      if(list[i].func === listener)
        break
    }

    if(i !== len) {
      list.splice(i, 1)
    }
  }
  for(var i = 0, len = this.children.length; i < len; ++i) {
    this.children[i].remove(event, listener)
  }
}

proto.send = function(event, bbox, args) {
  for(var i = 0, len = this.children.length; i < len; ++i) {
    if(bbox.intersects(this.children[i].bbox)) {
      this.children[i].send(event, bbox, args)
    }
  }

  var list = this.listeners[event]
  if(!list) {
    return
  }

  for(var i = 0, len = list.length; i < len; ++i) {
    if(list[i].bbox.intersects(bbox)) {
      list[i].func.apply(null, args)
    }
  }
}
