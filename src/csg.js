// Triangle-mesh constructive solid geometry using plane partition trees.
// All operations occur in document coordinates. This is not a B-rep kernel.
import * as THREE from "three";
const EPS = 1e-5;
class Face {
  constructor(vertices) {
    this.vertices = vertices;
    this.normal = new THREE.Vector3()
      .subVectors(vertices[1], vertices[0])
      .cross(new THREE.Vector3().subVectors(vertices[2], vertices[0]))
      .normalize();
    this.offset = this.normal.dot(vertices[0]);
  }
  clone() {
    return new Face(this.vertices.map((v) => v.clone()));
  }
  flip() {
    this.vertices.reverse();
    this.normal.negate();
    this.offset = -this.offset;
  }
}
function divide(face, plane, coplanarFront, coplanarBack, front, back) {
  const kinds = face.vertices.map((v) => {
    const d = plane.normal.dot(v) - plane.offset;
    return d > EPS ? 1 : d < -EPS ? 2 : 0;
  });
  const kind = kinds.reduce((a, b) => a | b, 0);
  if (kind === 0) {
    (plane.normal.dot(face.normal) > 0 ? coplanarFront : coplanarBack).push(
      face,
    );
    return;
  }
  if (kind === 1) {
    front.push(face);
    return;
  }
  if (kind === 2) {
    back.push(face);
    return;
  }
  const f = [],
    b = [];
  face.vertices.forEach((v, i) => {
    const j = (i + 1) % face.vertices.length,
      w = face.vertices[j],
      k = kinds[i],
      next = kinds[j];
    if (k !== 2) f.push(v.clone());
    if (k !== 1) b.push(v.clone());
    if ((k | next) === 3) {
      const alpha =
        (plane.offset - plane.normal.dot(v)) /
        plane.normal.dot(new THREE.Vector3().subVectors(w, v));
      const cut = v.clone().lerp(w, alpha);
      f.push(cut);
      b.push(cut.clone());
    }
  });
  if (f.length >= 3) front.push(new Face(f));
  if (b.length >= 3) back.push(new Face(b));
}
class Partition {
  constructor(faces = [], depth = 0) {
    this.plane = null;
    this.faces = [];
    this.front = null;
    this.back = null;
    this.build(faces, depth);
  }
  build(faces, depth = 0) {
    if (depth > 1024) throw Error("Boolean partition is too complex");
    if (!faces.length) return;
    if (!this.plane)
      this.plane = { normal: faces[0].normal.clone(), offset: faces[0].offset };
    const front = [],
      back = [];
    for (const f of faces)
      divide(f, this.plane, this.faces, this.faces, front, back);
    if (front.length) {
      this.front ??= new Partition();
      this.front.build(front, depth + 1);
    }
    if (back.length) {
      this.back ??= new Partition();
      this.back.build(back, depth + 1);
    }
  }
  invert() {
    this.faces.forEach((f) => f.flip());
    if (this.plane) {
      this.plane.normal.negate();
      this.plane.offset = -this.plane.offset;
    }
    this.front?.invert();
    this.back?.invert();
    [this.front, this.back] = [this.back, this.front];
  }
  clipFaces(faces) {
    if (!this.plane) return faces.slice();
    let front = [],
      back = [];
    for (const f of faces) divide(f, this.plane, front, back, front, back);
    if (this.front) front = this.front.clipFaces(front);
    back = this.back ? this.back.clipFaces(back) : [];
    return front.concat(back);
  }
  clipTo(other) {
    this.faces = other.clipFaces(this.faces);
    this.front?.clipTo(other);
    this.back?.clipTo(other);
  }
  all() {
    return this.faces.concat(this.front?.all() || [], this.back?.all() || []);
  }
}
function facesFromGeometry(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const a = g.getAttribute("position"),
    faces = [];
  if (a.count > 36000)
    throw Error("Mesh is too large for browser Boolean operations");
  for (let i = 0; i < a.count; i += 3) {
    const vertices = [0, 1, 2].map((k) =>
      new THREE.Vector3().fromBufferAttribute(a, i + k),
    );
    const f = new Face(vertices);
    if (f.normal.lengthSq() > 0.5) faces.push(f);
  }
  if (g !== geometry) g.dispose();
  return faces;
}
function geometryFromFaces(faces) {
  const data = [];
  for (const f of faces)
    for (let i = 1; i < f.vertices.length - 1; i++) {
      const a = f.vertices[0],
        b = f.vertices[i],
        c = f.vertices[i + 1];
      if (
        new THREE.Vector3()
          .subVectors(b, a)
          .cross(new THREE.Vector3().subVectors(c, a))
          .lengthSq() < 1e-14
      )
        continue;
      for (const v of [a, b, c]) data.push(v.x, v.y, v.z);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(data, 3));
  g.computeVertexNormals();
  return g;
}
export function booleanGeometry(first, second, operation) {
  if (!["union", "cut", "intersection"].includes(operation))
    throw Error("Unknown Boolean operation");
  const af = facesFromGeometry(first),
    bf = facesFromGeometry(second);
  if (!af.length || !bf.length) {
    if (operation === "union") return (af.length ? first : second).clone();
    if (operation === "cut") return first.clone();
    return geometryFromFaces([]);
  }
  const a = new Partition(af),
    b = new Partition(bf);
  if (operation === "union") {
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.all());
  } else if (operation === "cut") {
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.all());
    a.invert();
  } else {
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.all());
    a.invert();
  }
  return geometryFromFaces(a.all());
}
export function meshVolume(g) {
  const a = g.getAttribute("position"),
    index = g.index;
  let volume = 0;
  const count = index ? index.count : a.count;
  for (let i = 0; i < count; i += 3) {
    const vs = [0, 1, 2].map((k) =>
      new THREE.Vector3().fromBufferAttribute(
        a,
        index ? index.getX(i + k) : i + k,
      ),
    );
    volume += vs[0].dot(vs[1].clone().cross(vs[2])) / 6;
  }
  return Math.abs(volume);
}
