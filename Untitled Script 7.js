// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: magic;
// Album of the Day Widget for Scriptable
// Large Widget Size: 360×376 pt
// Clean, Elegant Design

const API_URL = "https://rwyfeucuskelwxdzkznd.supabase.co/functions/v1/widgy-album?project=figureitout";

// Fetch album data
async function fetchAlbumData() {
  try {
    const req = new Request(API_URL);
    const data = await req.loadJSON();
    return data;
  } catch (error) {
    console.error("Error fetching album:", error);
    return null;
  }
}

// Create sophisticated gradient
function createGradientBackground() {
  const gradient = new LinearGradient();
  gradient.locations = [0, 0.5, 1];
  gradient.colors = [
    new Color("#fafafa"),
    new Color("#f5f5f5"),
    new Color("#efefef")
  ];
  return gradient;
}

// Create widget
async function createWidget() {
  const widget = new ListWidget();
  const album = await fetchAlbumData();
  
  if (!album) {
    widget.backgroundColor = new Color("#1a1a1a");
    widget.setPadding(20, 20, 20, 20);
    const errorText = widget.addText("Unable to load album");
    errorText.font = Font.mediumSystemFont(15);
    errorText.textColor = new Color("#888888");
    return widget;
  }
  
  // Premium gradient background
  widget.backgroundGradient = createGradientBackground();
  widget.setPadding(0, 0, 0, 0);
  
  // Main container
  const mainStack = widget.addStack();
  mainStack.layoutVertically();
  mainStack.setPadding(20, 20, 20, 20);
  
  // Header section
  const headerStack = mainStack.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();
  
  const headerLeft = headerStack.addStack();
  headerLeft.layoutHorizontally();
  headerLeft.centerAlignContent();
  headerLeft.spacing = 6;
  headerLeft.url = "https://1001albumsgenerator.com/figureitout";
  
  const vinylSymbol = SFSymbol.named("opticaldisc");
  const vinylIcon = headerLeft.addImage(vinylSymbol.image);
  vinylIcon.imageSize = new Size(14, 14);
  vinylIcon.tintColor = new Color("#374151");
  
  const headerTitle = headerLeft.addText("ALBUM OF THE DAY");
  headerTitle.font = Font.semiboldSystemFont(10);
  headerTitle.textColor = new Color("#6b7280");
  headerTitle.letterSpacing = 1;
  
  headerStack.addSpacer();
  
  // Simple Spotify link text
  if (album.spotifyUrl) {
    const spotifyLink = headerStack.addStack();
    spotifyLink.url = album.spotifyUrl;
    spotifyLink.layoutHorizontally();
    spotifyLink.centerAlignContent();
    spotifyLink.spacing = 4;
    
    const spotifyIcon = spotifyLink.addImage(SFSymbol.named("play.circle.fill").image);
    spotifyIcon.imageSize = new Size(16, 16);
    spotifyIcon.tintColor = new Color("#1DB954");
    
    const spotifyText = spotifyLink.addText("Listen");
    spotifyText.font = Font.mediumSystemFont(12);
    spotifyText.textColor = new Color("#374151");
  }
  
  mainStack.addSpacer(18);
  
  // Album cover
  if (album.coverUrl) {
    try {
      const coverReq = new Request(album.coverUrl);
      const coverImg = await coverReq.loadImage();
      
      const coverContainer = mainStack.addStack();
      coverContainer.addSpacer();
      
      const coverImage = coverContainer.addImage(coverImg);
      coverImage.imageSize = new Size(240, 240);
      coverImage.cornerRadius = 16;
      coverImage.borderWidth = 1;
      coverImage.borderColor = new Color("#000000", 0.06);
      
      coverContainer.addSpacer();
      
    } catch (error) {
      console.error("Error loading cover:", error);
    }
  }
  
  mainStack.addSpacer(20);
  
  // Album title
  const albumTitle = mainStack.addText(album.title);
  albumTitle.font = Font.boldSystemFont(21);
  albumTitle.textColor = new Color("#0f172a");
  albumTitle.lineLimit = 2;
  albumTitle.minimumScaleFactor = 0.85;
  
  mainStack.addSpacer(6);
  
  // Artist name
  const artistName = mainStack.addText(album.artist);
  artistName.font = Font.mediumSystemFont(16);
  artistName.textColor = new Color("#64748b");
  artistName.lineLimit = 1;
  
  mainStack.addSpacer(4);
  
  // Year as simple text under artist
  if (album.year) {
    const yearText = mainStack.addText(album.year);
    yearText.font = Font.regularSystemFont(14);
    yearText.textColor = new Color("#94a3b8");
  }
  
  // Set widget URL
  if (album.spotifyUrl) {
    widget.url = album.spotifyUrl;
  }
  
  // Refresh every hour
  widget.refreshAfterDate = new Date(Date.now() + 3600000);
  
  return widget;
}

// Run the widget
const widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}
Script.complete();