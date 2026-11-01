import fs from 'fs';

const path = 'src/apps/web/ui/library/GridView.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 content-start">
              {filteredAssets.map((asset, index) => {
                const groupCount = isGrouped ? assets.filter(a => (a.groupId || a.assetId) === (asset.groupId || asset.assetId)).length : 1;
                
                return (
                  <div 
                    key={asset.assetId + index}
                    className={\`bg-zinc-800 rounded-lg overflow-hidden flex flex-col cursor-pointer transition-all aspect-square relative group \${
                      selectedAssetIds.has(asset.assetId) ? 'ring-4 ring-indigo-500 scale-[0.98]' : 'hover:ring-2 hover:ring-indigo-500'
                    }\`}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleAssetSelection(asset.assetId);
                      } else {
                        setSelectedIndex(index);
                      }
                    }}
                  >
                    <SmartImage
                      src={asset.thumbnailUrl}
                      assetId={asset.assetId}
                      alt={asset.fileName || asset.file.name}
                      className={\`w-full h-3/4 object-cover bg-zinc-900 transition-opacity \${selectedAssetIds.has(asset.assetId) ? 'opacity-50' : ''}\`}
                      retryCount={5}
                    />
                    
                    {/* Selection Overlay */}
                    {isSelectionMode && (
                      <div className="absolute inset-0 z-20 flex items-start justify-start p-2">
                        <div className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all \${
                          selectedAssetIds.has(asset.assetId) 
                            ? 'bg-indigo-500 border-indigo-400 shadow-lg' 
                            : 'bg-black/20 border-white/50 backdrop-blur-sm'
                        }\`}>
                          {selectedAssetIds.has(asset.assetId) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex gap-1 items-center z-10">
                      {asset.isTrashed && (
                        <div className="bg-red-900/80 px-1.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm border border-red-700/50 flex items-center gap-1">
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] font-bold text-red-200">Trashed</span>
                        </div>
                      )}
                      {!asset.isTrashed && asset.pickStatus === 'picked' && (
                        <div className="bg-zinc-900/80 p-1 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50">
                          <Flag className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {!asset.isTrashed && asset.pickStatus === 'rejected' && (
                        <div className="bg-zinc-900/80 p-1 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50">
                          <XIcon className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                      {asset.rating && (
                        <div className="bg-zinc-900/80 px-1 py-0.5 rounded-full shadow-lg backdrop-blur-sm border border-zinc-700/50 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] font-bold text-yellow-400">{asset.rating}</span>
                        </div>
                      )}
                      {asset.colorTag && asset.colorTag !== 'none' && (
                        <div 
                          className="w-3 h-3 rounded-full shadow-md border border-white/20"
                          style={{ backgroundColor: asset.colorTag === 'red' ? '#ef4444' : asset.colorTag === 'green' ? '#22c55e' : '#3b82f6' }}
                        />
                      )}
                      {isGrouped && groupCount > 1 && (
                        <div className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                          {groupCount}
                        </div>
                      )}
                    </div>
                    
                    {/* Rating Stars (Removed from here as it's now in badges for priority) */}
                    
                    
                    <div className="p-2 h-1/4 text-xs text-zinc-300 flex flex-col justify-center">
                      <span className="truncate">{asset.fileName || asset.file.name}</span>
                      <span className="text-zinc-500 truncate">{asset.metadata.camera}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )`;

const replacement = `        ) : (
          <div className="flex-1 p-2 overflow-hidden">
            <AutoSizer>
              {({ height, width }) => {
                const columnCount = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;
                const columnWidth = width / columnCount;
                const rowCount = Math.ceil(filteredAssets.length / columnCount);
                
                return (
                  <Grid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={columnWidth}
                    width={width}
                    itemData={{
                      columnCount,
                      filteredAssets,
                      isGrouped,
                      groupCounts,
                      isSelectionMode,
                      selectedAssetIds,
                      toggleAssetSelection,
                      setSelectedIndex,
                      assets
                    }}
                    className="custom-scrollbar"
                  >
                    {GridCell}
                  </Grid>
                );
              }}
            </AutoSizer>
          </div>
        )`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log('Replaced successfully');
} else {
  console.log('Target not found. Trying regex...');
  const regex = /<div className="flex-1 overflow-y-auto p-4">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
  if (regex.test(content)) {
    content = content.replace(regex, replacement.replace('        ) : (\n', ''));
    fs.writeFileSync(path, content);
    console.log('Replaced successfully using regex');
  } else {
    console.log('Regex also failed');
  }
}
