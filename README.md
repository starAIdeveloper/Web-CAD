# Web CAD
A browser CAD workbench inspired by desktop parametric CAD workflows. Built with Three.js and an original plane-partition mesh CSG implementation. It supports editable solids, sketch extrusion, dependency-based Boolean features, undo/redo, measurement, and file exports.

## Run
Node.js 22 or newer. `npm install`, then `npm run dev`. Open the localhost URL. `npm run build` produces a static site in dist. Serve dist over HTTP rather than opening index.html with file://. No account, backend, or cloud storage is required.

## Modeling
- Create boxes, cylinders, spheres, and extruded polygon profiles.
- Select an object in the tree or by clicking its visible surface. Edit dimensions, color, name, translation, and XYZ rotation in Properties. Dimensions use document units labeled mm.
- Shift-click two objects for Union, Cut A minus B, or Intersection. Selection order determines A/B. Source features remain in the document but are hidden. Editing a source recomputes dependent results.
- Create a sketch by clicking XY grid vertices with 1 mm snapping, then Pad it with an editable height. Profiles may be concave, but must be simple and non-self-intersecting. Select an extrusion and choose Edit profile vertices to revise its sketch.
- Duplicate features, toggle visibility, and delete objects. Referenced source features cannot be deleted until their dependents are removed. Deleting a Boolean result reveals its source features.
- Undo/redo covers modeling, imports, and document replacement. Ctrl/Cmd+Z undoes, Shift+Ctrl/Cmd+Z redoes; Ctrl/Cmd+S downloads the project. Delete removes the selected feature.

## View and measurement
Orbit by left dragging, pan by right dragging, and zoom with the wheel. Fit all and standard view buttons frame visible solids. Switch between perspective and orthographic views; toggle wireframe and grid. Section Z clips the display and does not modify exported geometry. Measure mode collects two raycast surface points and displays their Euclidean distance in document units. It does not snap to exact analytic vertices.

## Files
Save project downloads the parametric document as JSON, including Boolean references and sketch vertices. Open JSON validates dimensions, identifiers, dependencies, and polygon geometry before replacing the document. The previous document remains undoable. The browser also autosaves locally when localStorage is available; no project data is sent to a server.

STL and OBJ export visible tessellated geometry; PNG captures the viewport. Exports are mesh formats. The sample shows a mounting block with a cylindrical bore and an L-profile extrusion.

## Validation
`npm test` runs 14 tests for Boolean volumes, disjoint/coincident/nested solids, primitive geometry, parametric recomputation, placements, sketches, history, and import validation. `npm run build` builds the production app. Optional Python Playwright validation: `python tests/browser_check.py` with CHROMIUM_PATH set if necessary. The browser report covers actual WebGL rendering, picking, sketch drawing, Boolean operations, measurement, exports, JSON roundtrip, reload persistence, and a mobile-sized layout. docs contains actual rendered screenshots.

## Scope and limits
This is an independent mesh CAD prototype, not FreeCAD's geometry kernel. No B-rep, STEP/IGES/FCStd import, constraint solver, fillets, chamfers, assemblies, CAM, or engineering certification. Curved surfaces and volumes are tessellated approximations. Booleans use numeric tolerances and may fail on complex or degenerate input. Validate exported mesh topology before fabrication. The document is capped at 40 features, 64 vertices per sketch, and 2 MB per imported project. Boolean computation runs in the browser thread; complex documents may pause interaction. Small model editing is the intended workload. Physical phone/tablet testing remains unperformed.

## History
Implementation commits record work completed in this session without backdating. artifacts/Web-CAD.bundle preserves the original local commit IDs and metadata alongside the imported GitHub history.
