import { useState, useEffect, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [images, setImages] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImg, setCurrentImg] = useState(null);
  const [pendingDataUrl, setPendingDataUrl] = useState(null);
  const [imgTitle, setImgTitle] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiTags, setAiTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [manualTags, setManualTags] = useState("");
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadImages(); }, []);

  const loadImages = async () => {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
        const tags = [...new Set(data.images.flatMap(img => img.tags ? img.tags.split(",") : []))];
        setAllTags(tags);
      }
    } catch(e) {}
  };

  const filteredImages = images.filter(img => {
    const imgTags = img.tags ? img.tags.split(",") : [];
    const matchTag = currentFilter === "all" || imgTags.includes(currentFilter);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || img.title.toLowerCase().includes(q) || imgTags.some(t => t.includes(q));
    return matchTag && matchSearch;
  });

  const openUpload = () => {
    setPendingDataUrl(null); setImgTitle(""); setAiStatus("");
    setAiTags([]); setSelectedTags([]); setManualTags(""); setSaveDisabled(true);
    setUploadOpen(true);
  };

  const openModal = (img) => { setCurrentImg(img); setModalOpen(true); };

  const deleteImage = async () => {
    if (!currentImg || !confirm("Delete this image?")) return;
    await fetch("/api/images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentImg.id }) });
    setModalOpen(false);
    loadImages();
  };

  const readFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => { setPendingDataUrl(e.target.result); analyzeMood(e.target.result); };
    reader.readAsDataURL(file);
  };

  const analyzeMood = async (dataUrl) => {
    setAiStatus("analyzing"); setAiTags([]); setSaveDisabled(true); setAnalyzing(true);
    const base64 = dataUrl.split(",")[1];
    const mimeMatch = dataUrl.match(/data:(image\/[\w+]+);/);
    const mediaType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, mediaType, existingTags: allTags }),
      });
      const data = await res.json();
      if (data.tags) { setAiTags(data.tags); setSelectedTags(data.tags); setAiStatus("suggested"); setSaveDisabled(false); }
      else { setAiStatus("error"); setSaveDisabled(false); }
    } catch(e) { setAiStatus("error"); setSaveDisabled(false); }
    setAnalyzing(false);
  };

  const toggleTag = (tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const saveImage = async () => {
    if (!pendingDataUrl || saving) return;
    setSaving(true);
    const base64 = pendingDataUrl.split(",")[1];
    const mimeMatch = pendingDataUrl.match(/data:(image\/[\w+]+);/);
    const mediaType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    let tags = selectedTags.length > 0 ? selectedTags : manualTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!tags.length) tags = ["untagged"];

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, mediaType }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) { alert("Upload failed"); setSaving(false); return; }

      await fetch("/api/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: imgTitle || "untitled", tags, image_url: uploadData.url }),
      });
      await loadImages();
      setUploadOpen(false); setPendingDataUrl(null);
    } catch(e) { alert("Save failed"); }
    setSaving(false);
  };

  const img = currentImg;

  return (
    <>
      <Head>
        <title>mood library</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400&family=DM+Mono:wght@300&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg: #fafaf8; --surface: #fff; --border: rgba(0,0,0,0.1); --border-soft: rgba(0,0,0,0.06); --text: #1a1a1a; --muted: #888; }
        body { font-family: 'DM Sans', sans-serif; font-weight: 300; background: var(--bg); color: var(--text); min-height: 100vh; }
        input, button { font-family: inherit; }
      `}</style>

      <header style={{ position:"sticky", top:0, zIndex:100, background:"rgba(250,250,248,0.92)", backdropFilter:"blur(12px)", borderBottom:"0.5px solid var(--border)", padding:"0 32px", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
        <span style={{ fontFamily:"'DM Mono', monospace", fontSize:13, letterSpacing:"0.05em" }}>mood library</span>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <span style={{ fontSize:11, color:"var(--muted)", fontFamily:"'DM Mono', monospace" }}>{images.length} {images.length===1?"image":"images"}</span>
          <button onClick={openUpload} style={{ fontWeight:300, fontSize:12, padding:"7px 18px", border:"0.5px solid var(--border)", background:"transparent", color:"var(--text)", cursor:"pointer" }}>+ upload</button>
        </div>
      </header>

      <div style={{ padding:"14px 32px", borderBottom:"0.5px solid var(--border-soft)", display:"flex", gap:6, flexWrap:"wrap" }}>
        {["all", ...[...allTags].sort()].map(tag => (
          <span key={tag} onClick={() => setCurrentFilter(tag)} style={{ fontFamily:"'DM Mono', monospace", fontSize:11, padding:"5px 14px", border:"0.5px solid var(--border)", cursor:"pointer", letterSpacing:"0.04em", color:currentFilter===tag?"var(--bg)":"var(--muted)", background:currentFilter===tag?"var(--text)":"transparent", borderColor:currentFilter===tag?"var(--text)":"var(--border)" }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{ padding:"12px 32px", borderBottom:"0.5px solid var(--border-soft)" }}>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="search by title or mood..." style={{ width:"100%", fontSize:13, fontWeight:300, padding:0, border:"none", background:"transparent", color:"var(--text)", outline:"none" }} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))" }}>
        {filteredImages.length === 0 ? (
          <div style={{ gridColumn:"1/-1", padding:"80px 32px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:12, color:"var(--muted)", marginBottom:8 }}>no images yet</div>
            <div style={{ fontSize:13, color:"rgba(0,0,0,0.3)" }}>upload your first image to get started</div>
          </div>
        ) : filteredImages.map((img, i) => {
          const imgTags = img.tags ? img.tags.split(",") : [];
          return (
            <div key={i} onClick={() => openModal(img)} style={{ position:"relative", aspectRatio:"1", overflow:"hidden", borderRight:"0.5px solid var(--border-soft)", borderBottom:"0.5px solid var(--border-soft)", cursor:"pointer", background:"var(--surface)" }}>
              <img src={img.image_url} alt={img.title} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"32px 14px 14px", background:"linear-gradient(transparent, rgba(250,250,248,0.96))", opacity:0, transition:"opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity=1} onMouseLeave={e => e.currentTarget.style.opacity=0}>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", letterSpacing:"0.06em", marginBottom:3 }}>{imgTags.join(" · ")}</div>
                <div style={{ fontSize:12, fontWeight:400 }}>{img.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && img && (
        <div onClick={e => { if(e.target===e.currentTarget) setModalOpen(false); }} style={{ position:"fixed", inset:0, background:"rgba(250,250,248,0.9)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
          <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", maxWidth:760, width:"100%", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ flex:1, minHeight:0, background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <img src={img.image_url} alt={img.title} style={{ maxWidth:"100%", maxHeight:"60vh", objectFit:"contain", display:"block" }} />
            </div>
            <div style={{ borderTop:"0.5px solid var(--border-soft)", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", letterSpacing:"0.06em", marginBottom:4 }}>{img.tags ? img.tags.split(",").join(" · ") : ""}</div>
                <div style={{ fontSize:14 }}>{img.title}</div>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <button onClick={deleteImage} style={{ fontSize:11, padding:"6px 16px", border:"0.5px solid var(--border)", background:"transparent", color:"var(--muted)", cursor:"pointer" }}>delete</button>
                <button onClick={() => setModalOpen(false)} style={{ fontFamily:"'DM Mono', monospace", fontSize:18, background:"none", border:"none", color:"var(--muted)", cursor:"pointer" }}>×</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div onClick={e => { if(e.target===e.currentTarget) { setUploadOpen(false); setPendingDataUrl(null); } }} style={{ position:"fixed", inset:0, background:"rgba(250,250,248,0.9)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
          <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", width:"100%", maxWidth:480, padding:32, maxHeight:"90vh", overflowY:"auto" }}>
            <h2 style={{ fontFamily:"'DM Mono', monospace", fontWeight:300, fontSize:12, letterSpacing:"0.06em", color:"var(--muted)", marginBottom:24 }}>upload image</h2>

            {pendingDataUrl ? (
              <img src={pendingDataUrl} style={{ width:"100%", height:120, objectFit:"cover", marginBottom:16, border:"0.5px solid var(--border-soft)" }} />
            ) : (
              <div onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]); }}
                style={{ border:`0.5px dashed ${dragOver?"var(--text)":"var(--border)"}`, padding:40, textAlign:"center", cursor:"pointer", marginBottom:20 }}>
                <span style={{ fontSize:12, color:"var(--muted)", display:"block", marginBottom:4 }}>drop image here or click to browse</span>
                <span style={{ fontSize:11, color:"rgba(0,0,0,0.3)" }}>jpg, png, webp, gif</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => readFile(e.target.files[0])} />

            <div style={{ marginBottom:16 }}>
              <label style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>title</label>
              <input value={imgTitle} onChange={e => setImgTitle(e.target.value)} placeholder="untitled" style={{ width:"100%", fontSize:13, fontWeight:300, padding:"9px 12px", border:"0.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", outline:"none" }} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>mood — ai suggested</label>
              {analyzing && <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", marginBottom:10 }}>analyzing mood...</div>}
              {aiStatus==="suggested" && <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", marginBottom:10 }}>ai suggested — tap to deselect</div>}
              {aiStatus==="error" && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:"var(--muted)", marginBottom:8 }}>could not analyze — add tags manually</div>
                  <input value={manualTags} onChange={e => setManualTags(e.target.value)} placeholder="e.g. dreamy, dark, tender" style={{ width:"100%", fontSize:12, padding:"7px 10px", border:"0.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", outline:"none" }} />
                </div>
              )}
              {aiTags.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {aiTags.map(tag => {
                    const isNew = !allTags.includes(tag);
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <span key={tag} onClick={() => toggleTag(tag)} style={{ fontFamily:"'DM Mono', monospace", fontSize:11, padding:"5px 14px", border:`0.5px ${isNew?"dashed":"solid"} var(--border)`, cursor:"pointer", letterSpacing:"0.04em", color:isSelected?"var(--bg)":"var(--muted)", background:isSelected?"var(--text)":"transparent", borderColor:isSelected?"var(--text)":"var(--border)", userSelect:"none" }}>
                        {tag}{isNew?<span style={{ fontSize:9, opacity:0.5, marginLeft:3 }}>new</span>:""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:24 }}>
              <button onClick={() => { setUploadOpen(false); setPendingDataUrl(null); }} style={{ fontWeight:300, fontSize:12, padding:"8px 20px", border:"0.5px solid var(--border)", background:"transparent", color:"var(--muted)", cursor:"pointer" }}>cancel</button>
              <button onClick={saveImage} disabled={saveDisabled||saving} style={{ fontWeight:300, fontSize:12, padding:"8px 20px", border:"none", background:"var(--text)", color:"var(--bg)", cursor:saveDisabled||saving?"not-allowed":"pointer", opacity:saveDisabled||saving?0.4:1 }}>
                {saving?"saving...":"save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
