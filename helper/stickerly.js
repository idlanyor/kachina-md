import axios from 'axios';

class StickerLy {
    async search(query) {
        if (!query) throw new Error('Query is required');
        
        const { data } = await axios.post('https://api.sticker.ly/v4/stickerPack/smartSearch', {
            keyword: query,
            enabledKeywordSearch: true,
            filter: {
                extendSearchResult: false,
                sortBy: 'RECOMMENDED',
                languages: ['ALL'],
                minStickerCount: 5,
                searchBy: 'ALL',
                stickerType: 'ALL'
            }
        }, {
            headers: {
                'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                'content-type': 'application/json',
                'accept-encoding': 'gzip'
            }
        });
        
        return data.result.stickerPacks.map(pack => ({
            name: pack.name,
            author: pack.authorName,
            stickerCount: pack.resourceFiles.length,
            viewCount: pack.viewCount,
            exportCount: pack.exportCount,
            isPaid: pack.isPaid,
            isAnimated: pack.isAnimated,
            thumbnailUrl: `${pack.resourceUrlPrefix}${pack.resourceFiles[pack.trayIndex]}`,
            url: pack.shareUrl
        }));
    }
    
    async detail(url) {
        const match = url.match(/\/s\/([^\/\?#]+)/);
        if (!match) throw new Error('Invalid URL. Use sticker.ly share URL');
        
        const { data } = await axios.get(`https://api.sticker.ly/v4/stickerPack/${match[1]}?needRelation=true`, {
            headers: {
                'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                'content-type': 'application/json',
                'accept-encoding': 'gzip'
            }
        });
        
        return {
            name: data.result.name,
            author: {
                name: data.result.user.displayName,
                username: data.result.user.userName,
                bio: data.result.user.bio,
                followers: data.result.user.followerCount,
                following: data.result.user.followingCount,
                isPrivate: data.result.user.isPrivate,
                avatar: data.result.user.profileUrl,
                website: data.result.user.website,
                url: data.result.user.shareUrl
            },
            stickers: data.result.stickers.map(stick => ({
                fileName: stick.fileName,
                isAnimated: stick.isAnimated,
                imageUrl: `${data.result.resourceUrlPrefix}${stick.fileName}`
            })),
            stickerCount: data.result.stickers.length,
            viewCount: data.result.viewCount,
            exportCount: data.result.exportCount,
            isPaid: data.result.isPaid,
            isAnimated: data.result.isAnimated,
            thumbnailUrl: `${data.result.resourceUrlPrefix}${data.result.stickers[data.result.trayIndex].fileName}`,
            url: data.result.shareUrl
        };
    }
}

export default StickerLy;
