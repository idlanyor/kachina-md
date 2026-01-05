import axios from 'axios';
import FormData from 'form-data';

async function pinlens(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
    
    const form = new FormData();
    form.append('camera_type', '0');
    form.append('source_type', '1');
    form.append('video_autoplay_disabled', '0');
    form.append('page_size', '12');
    form.append('fields', 'storypinvideoblock.{block_type,video_signature,block_style,video[V_HLSV3_MOBILE, V_DASH_HEVC, V_HEVC_MP4_T1_V2, V_HEVC_MP4_T2_V2, V_HEVC_MP4_T3_V2, V_HEVC_MP4_T4_V2, V_HEVC_MP4_T5_V2],type},storypinimageblock.{image_signature,block_type,block_style,type},linkblock.{image_signature,src_url,normalized_url,block_type,image[345x],text,type,canonical_url},domain.{official_user()},collectionpinitem.{image_signature,images,dominant_color,link,pin_id,title},collectionpin.{root_pin_id,item_data},userwebsite.{official_user()},storypindata.{has_affiliate_products,static_page_count,pages_preview,metadata(),page_count,has_product_pins,total_video_duration},storypinpage.{layout,image_signature,video_signature,blocks,image_signature_adjusted,video[V_HLSV3_MOBILE, V_DASH_HEVC, V_HEVC_MP4_T1_V2, V_HEVC_MP4_T2_V2, V_HEVC_MP4_T3_V2, V_HEVC_MP4_T4_V2, V_HEVC_MP4_T5_V2],style,id,type,music_attributions,should_mute},pincarouseldata.{index,id,rich_summary(),rich_metadata(),carousel_slots},pincarouselslot.{rich_summary,item_id,domain,android_deep_link,link,details,images[345x,750x],id,ad_destination_url,title,rich_metadata},pin.{comment_count,is_eligible_for_related_products,shopping_flags,pinner(),promoted_is_lead_ad,ad_match_reason,destination_url_type,promoted_quiz_pin_data,promoted_is_showcase,type,carousel_data(),image_crop,story_pin_data_id,call_to_create_responses_count,promoted_is_removable,is_owned_by_viewer,digital_media_source_type,auto_alt_text,id,ad_destination_url,embed,ad_group_id,rich_summary(),grid_title,native_creator(),cacheable_id,source_interest(),is_native,has_variants,promoted_is_auto_assembled,is_premiere,is_eligible_for_web_closeup,promoted_is_quiz,done_by_me,closeup_description,creative_enhancement_slideshow_aspect_ratio,promoted_android_deep_link,is_oos_product,is_video,reaction_by_me,promoted_is_catalog_carousel_ad,dominant_color,virtual_try_on_type,promoted_is_sideswipe_disabled,domain,call_to_action_text,is_stale_product,link_domain(),music_attributions,collection_pin(),shopping_mdl_browser_type,is_promoted,ad_data(),recommendation_reason,ad_targeting_attribution(),link,sponsorship,is_unsafe,is_hidden,description,created_at,link_user_website(),title,is_cpc_ad,is_scene,image_signature,total_reaction_count,promoted_is_max_video,is_eligible_for_pre_loved_goods_label,tracking_params,alt_text,dpa_creative_type,promoted_lead_form(),is_eligible_for_pdp,is_visualization_enabled,is_unsafe_for_comments,is_call_to_create,ip_eligible_for_stela,dark_profile_link,via_pinner,is_downstream_promotion,promoter(),reaction_counts,should_open_in_stream,shuffle(),aggregated_pin_data(),is_repin,videos(),top_interest,category,story_pin_data(),should_mute,board(),is_virtual_try_on},user.{country,gender,type,age_in_years,follower_count,explicitly_followed_by_me,is_default_image,is_under_16,is_under_18,save_behavior,is_partner,id,is_verified_merchant,first_name,should_default_comments_off,show_creator_profile,last_name,avatar_color_index,is_private_profile,custom_gender,partner(),full_name,allow_idea_pin_downloads,image_medium_url,username,should_show_messaging,vto_beauty_access_status},board.{is_collaborative,collaborating_users(),created_at,privacy,should_show_shop_feed,type,is_ads_only,url,image_cover_url,layout,collaborated_by_me,followed_by_me,should_show_board_collaborators,owner(),name,collaborator_invites_enabled,action,section_count,id,category},video.{duration,id,video_list[V_HLSV3_MOBILE, V_DASH_HEVC]},richpinproductmetadata.{label_info,offers,additional_images,has_multi_images,shipping_info,offer_summary,item_set_id,item_id,name,id,type,brand},aggregatedpindata.{is_shop_the_look,comment_count,collections_header_text,is_stela,has_xy_tags,pin_tags,did_it_data,catalog_collection_type,slideshow_collections_aspect_ratio,aggregated_stats,id,is_dynamic_collections,pin_tags_chips},shuffle.{source_app_type_detailed,id},pin.images[200x,236x,736x,290x],storypinimageblock.image[200x,236x,736x,290x],storypinpage.image[200x,236x,736x,290x,1200x],storypinpage.image_adjusted[200x,236x,736x,290x,1200x]');
    form.append('image', buffer, `rynn_${Date.now()}.jpg`);
    
    const { data: responseData } = await axios.post('https://api.pinterest.com/v3/visual_search/lens/search/', form, {
        headers: {
            ...form.getHeaders(),
            'accept-encoding': 'gzip',
            'accept-language': 'id-ID',
            'authorization': `Bearer ${globalThis.pinAuth}`,
            'user-agent': 'Pinterest for Android/12.46.2 (Redmi Note 4; 10)',
            'x-node-id': 'true',
            'x-pinterest-app-type-detailed': '3',
            'x-pinterest-appstate': 'active'
        }
    });
    
    return responseData.data.map(pin => {
        const isVideo = !!(pin.videos || pin.story_pin_data?.pages_preview?.[0]?.video);
        let media = {};
        
        if (isVideo) {
            const videoList = pin.videos?.video_list || pin.story_pin_data?.pages_preview?.[0]?.video?.video_list;
            const videoUrl = videoList?.V_HEVC_MP4_T2_V2?.url || videoList?.V_HEVC_MP4_T5_V2?.url || videoList?.V_HEVC_MP4_T4_V2?.url || videoList?.V_HEVC_MP4_T3_V2?.url || videoList?.V_HEVC_MP4_T1_V2?.url || videoList?.V_720P?.url || videoList?.V_HLSV3_MOBILE?.url || null;
            const thumbnailUrl = videoList?.V_HEVC_MP4_T5_V2?.thumbnail || videoList?.V_720P?.thumbnail || videoList?.V_HLSV3_MOBILE?.thumbnail || pin.images?.['736x']?.url || '';
            
            media = {
                type: 'video',
                url: videoUrl,
                thumbnailUrl: thumbnailUrl
            };
        } else {
            media = {
                type: 'image',
                url: pin.story_pin_data?.pages_preview?.[0]?.image?.images?.originals?.url || pin.images?.originals?.url || pin.images?.['736x']?.url || ''
            };
        }

        return {
            id: pin.id,
            title: pin.title || pin.grid_title || '',
            description: pin.description || '',
            media: media,
            creator: pin.native_creator ? {
                name: pin.native_creator.full_name,
                username: pin.native_creator.username,
                followers: pin.native_creator.follower_count || 0,
                avatar: pin.native_creator.image_medium_url || null,
                url: `https://pinterest.com/${pin.native_creator.username}/`
            } : null,
            stats: {
                saves: pin.aggregated_pin_data?.aggregated_stats?.saves || 0,
                comments: pin.comment_count || 0,
                reactions: pin.total_reaction_count || 0
            },
            metadata: {
                is_video: isVideo,
                is_repin: pin.is_repin || false,
                is_native: pin.is_native || false,
                is_promoted: pin.is_promoted || false,
                is_unsafe: pin.is_unsafe || false
            },
            created_at: pin.created_at ? new Date(pin.created_at).toLocaleString('en-US') : null,
            url: `https://pinterest.com/pin/${pin.id}/`
        };
    });
}

export default pinlens;
