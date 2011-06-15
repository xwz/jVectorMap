/*!
 * jVectorMap version 0.2
 *
 * Copyright 2011, Kirill Lebedev, Xiang Wei Zhuo
 * Licensed under the MIT license.
 *
 */
(function( $ ){
    
	var apiEvents = 
    {
        onInit:         'init',
        onZoomIn:       'zoomin',
        onZoomOut:      'zoomout',
        onRegionOver:   'regionmouseover',
        onRegionOut:    'regionmouseout',
        onRegionClick:  'regionclick'
	};
	
    $.fn.vectorMap = function(options) 
    {
        var config = 
        {
			map: 'world',
            style: {
                backgroundColor: '#EFF7FD', 
                strokeColor: '#006CAC', 
                fillColor: '#fff',
                strokeWidth: 0.4
            },
            container: this
		};
        if (options === 'addMap') 
        {
            WorldMap.maps[arguments[1]] = arguments[2];
        }
        // allow of $('#map').vectorMap('fillColor', 'red')
        else if (typeof(options) === 'string' && config.style[arguments[0]]) 
        {
            var method = 'set'+arguments[0].charAt(0).toUpperCase()+arguments[0].substr(1);
			this.data('mapObject')[method].apply(this.data('mapObject'), Array.prototype.slice.call(arguments, 1));
        } 
        else
        {
            $.extend(true,config, options);
            this.css({position: 'relative', overflow: 'hidden' });
	    	for (var e in apiEvents) 
            {
			    if (config[e]) 
                {   
				    this.bind(apiEvents[e]+'.jvectormap', config[e]);
			    }
		    } 
			var map = new WorldMap(config);
            this.data('mapObject', map);
        }
    };
    
    var VectorCanvas = function(width, height) 
    {
		this.mode = window.SVGAngle ? 'svg' : 'vml';
		if (this.mode == 'svg') 
        {
			this.createSvgNode = function(nodeName) 
            {
				return document.createElementNS(this.svgns, nodeName);
			}
		} 
        else 
        {
			try 
            {
				if (!document.namespaces.rvml) 
                {
					document.namespaces.add("rvml","urn:schemas-microsoft-com:vml");
				}
				this.createVmlNode = function (tagName) 
                {
					return document.createElement('<rvml:' + tagName + ' class="rvml">');
				};
			} 
            catch (e) 
            {
				this.createVmlNode = function (tagName) 
                {
					return document.createElement('<' + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
				};
			}
			document.createStyleSheet().addRule(".rvml", "behavior:url(#default#VML)");
		}
		if (this.mode == 'svg') 
        {
			this.canvas = this.createSvgNode('svg');
		} 
        else 
        {
			this.canvas = this.createVmlNode('group');
			this.canvas.style.position = 'absolute';
		}
		this.setSize(width, height);
    }
	
	VectorCanvas.prototype = 
    {
        svgns: "http://www.w3.org/2000/svg",
        mode: 'svg',
        width: 0,
        height: 0,
        canvas: null,
        
        setSize: function(width, height) 
        {
            if (this.mode == 'svg') 
            {
                this.canvas.setAttribute('width', width);
                this.canvas.setAttribute('height', height);
            } 
            else 
            {
                this.canvas.style.width = width + "px";
                this.canvas.style.height = height + "px";
                this.canvas.coordsize = width+' '+height;
                this.canvas.coordorigin = "0 0";
                if (this.rootGroup) 
                {
                    var paths = this.rootGroup.getElementsByTagName('shape');
                    for(var i=0, l=paths.length; i<l; i++) 
                    {
                        paths[i].coordsize = width+' '+height;
                        paths[i].style.width = width+'px';
                        paths[i].style.height = height+'px';
                    }
                    this.rootGroup.coordsize = width+' '+height;
                    this.rootGroup.style.width = width+'px';
                    this.rootGroup.style.height = height+'px';
                }
            }
            this.width = width;
            this.height = height;    
        },
        
        createPath: function(config) 
        {
            var node = this.createNode('path');
            if (this.mode == 'svg') 
            {
                node.setAttribute('d', config.path);                
            } 
            else 
            {
                node.path = VectorCanvas.pathSvgToVml(config.path);
                var scale = this.createVmlNode('skew');
                scale.on = true;
                scale.matrix = '0.01,0,0,0.01,0,0';
                scale.offset = '0,0';
                node.appendChild(scale);
            }
            return node;
        },

        createNode : function(type)
        {
            var vmlNode = {
                'path'      : 'shape',
                'circle'    : 'oval'
            };

            var node;
            if (this.mode == 'svg') 
            {
                node = this.createSvgNode(type);
                node.setFillColor = function(color) {
                    this.setAttribute("fill", color);
                };
                node.setStrokeColor = function(color) {
                    this.setAttribute('stroke', color);
                };
                node.setStrokeWidth = function(width) {
                    this.setAttribute('stroke-width', width);
                };
            } 
            else 
            {
                node = this.createVmlNode(vmlNode[type]);
                node.coordorigin = "0 0";
                node.coordsize = this.width + ' ' + this.height;
                node.style.width = this.width+'px';
                node.style.height = this.height+'px';
                node.stroked = false;
                var fill = this.createVmlNode('fill');
                node.appendChild(fill);
                node.setFillColor = function(color) 
                {
                    this.getElementsByTagName('fill')[0].color = color;
                };
                node.setStrokeColor = function(color) 
                {
                    this.stroked = true;
                    this.strokecolor = color;
                };
                node.setStrokeWidth = function(width) 
                {
                    this.strokeweight = width;
                };
            }
            return node;
        },
        
        createGroup: function(isRoot) 
        {
            var node;
            if (this.mode == 'svg') 
            {
                node = this.createSvgNode('g');
            } 
            else 
            {
                node = this.createVmlNode('group');
                node.style.width = this.width+'px';
                node.style.height = this.height+'px';
                node.style.left = '0px';
                node.style.top = '0px';
                node.coordorigin = "0 0";
                node.coordsize = this.width + ' ' + this.height;
            }
            if (isRoot) 
            {
                this.rootGroup = node;
            }
            return node;
        },
        
        applyTransformParams: function(scale, transX, transY) 
        {
            if (this.mode == 'svg') 
            {
                this.rootGroup.setAttribute('transform', 'scale('+scale+') translate('+transX+', '+transY+')');
            } 
            else 
            {
                this.rootGroup.coordorigin = (this.width-transX)+','+(this.height-transY);
                this.rootGroup.coordsize = this.width/scale+','+this.height/scale;
            }
        }
    }
	
	VectorCanvas.pathSvgToVml = function(path) 
    {
		var result = '';
		var cx = 0, cy = 0;
		return path.replace(/([MmLlHhVvCc])((?:-?(?:\d+)?(?:\.\d+)?,?\s?)+)/g, function(segment, letter, coords, index)
        {
			coords = coords.replace(/(\d)-/g, '$1,-').replace(/\s+/g, ',').split(',');
			if (!coords[0]) coords.shift();
			for (var i=0,l=coords.length; i<l; i++) 
            {
				coords[i] = Math.round(100*coords[i]);
			}
			switch (letter) 
            {
				case 'm':
					cx += coords[0];
					cy += coords[1];
					return 't'+coords.join(',');
				break;
				case 'M':
					cx = coords[0];
					cy = coords[1];
					return 'm'+coords.join(',');
				break;
				case 'l':
					cx += coords[0];
					cy += coords[1];
					return 'r'+coords.join(',');
				break;
				case 'L':
					cx = coords[0];
					cy = coords[1];
					return 'l'+coords.join(',');
				break;
				case 'h':
					cx += coords[0];
					return 'r'+coords[0]+',0';
				break;
				case 'H':
					cx = coords[0];
					return 'l'+cx+','+cy;
				break;
				case 'v':
					cy += coords[0];
					return 'r0,'+coords[0];
				break;
				case 'V':
					cy = coords[0];
					return 'l'+cx+','+cy;
				break;
				case 'c':
					return 'v'+coords.join(',');
				break;
				case 'C':
					return 'c'+coords.join(',');
				break;
			}
			return '';
		}).replace(/z/g, 'x');
	}
    
    var WorldMap = function(params) 
    {
		var map = this;
		var mapData = WorldMap.maps[params.map];
		
		this.container = params.container;
		
		this.defaultWidth = mapData.width;
		this.defaultHeight = mapData.height;
		
		this.style = params.style;
		this.setBackgroundColor(this.style.backgroundColor);
		
		this.width = params.container.width();
		this.height = params.container.height();
		
		this.resize();

		$(window).resize(function()
        {
			map.width = params.container.width();
			map.height = params.container.height();
			map.resize();
			map.canvas.setSize(map.width, map.height);
			map.applyTransform();
		});
		
		this.canvas = new VectorCanvas(this.width, this.height);
		params.container.append(this.canvas.canvas);
		
		this.makeDraggable();
		
		this.rootGroup = this.canvas.createGroup(true);
		
		this.index = WorldMap.mapIndex;
		$('<div/>').addClass('jvectormap-zoomin').text('+').appendTo(params.container);
		$('<div/>').addClass('jvectormap-zoomout').html('&#x2212;').appendTo(params.container);

		for(var key in mapData.paths) 
        {
			var path = this.canvas.createPath({path: mapData.paths[key]});
			path.setFillColor(this.style.fillColor);
            path.setStrokeColor(this.style.strokeColor);
            path.setStrokeWidth(this.style.strokeWidth);
			path.id = 'jvectormap'+map.index+'_'+key;
			this.countries[key] = path;
			$(this.rootGroup).append(path);
		}

        $(params.container).delegate(this.canvas.mode == 'svg' ? 'path' : 'shape', 'mouseover mouseout click', function(e)
        {
		    var country = e.target.id.split('_').pop();
            $(params.container).trigger('region'+e.type, [map, country]);
		});

        $(params.container).trigger('init', [map]);
		
		this.canvas.canvas.appendChild(this.rootGroup);		
		this.applyTransform();
        this.bindZoomButtons();	
		WorldMap.mapIndex++;
	}
	
	WorldMap.prototype = 
    {
        transX: 0,
        transY: 0,
        scale: 1,
        baseTransX: 0,
        baseTransY: 0,
        baseScale: 1,
        
        width: 0,
        height: 0,
        countries: {},
        zoomStep: 2.0,
        zoomMaxStep: 4,
        zoomCurStep: 1,
        
		setBackgroundColor: function(backgroundColor) 
        {
			this.container.css('background-color', backgroundColor);
		},
	
        setStrokeWidth: function(width) 
        {
            this.foreachCountry('setStrokeWidth', width);
        },

        setFillColor : function(color)
        {
            this.foreachCountry('setFillColor', color);
        },

        setStrokeColor : function(color)
        {
            this.foreachCountry('setStrokeColor', color);
        },

        foreachCountry: function(method, arg)
        {
            if(typeof(arg)==='object')
            {
                for(var key in arg)
                {
                    this.countries[key][method].apply(this.countries[key], [arg[key]]);
                }
            }
            else
            {
                for(var key in this.countries)
                {
                    this.countries[key][method].apply(this.countries[key], [arg]);
                }
            }
        },        
	
        resize: function() 
        {
            var curBaseScale = this.baseScale;
            if (this.width / this.height > this.defaultWidth / this.defaultHeight) 
            {
                this.baseScale = this.height / this.defaultHeight;
                this.baseTransX = Math.abs(this.width - this.defaultWidth * this.baseScale) / (2 * this.baseScale);
            } 
            else 
            {
                this.baseScale = this.width / this.defaultWidth;
                this.baseTransY = Math.abs(this.height - this.defaultHeight * this.baseScale) / (2 * this.baseScale);
            }
            this.scale *= this.baseScale / curBaseScale;
            this.transX *= this.baseScale / curBaseScale;
            this.transY *= this.baseScale / curBaseScale;
        },
        
        applyTransform: function() 
        {
            var maxTransX, maxTransY, minTransX, maxTransY;
            if (this.defaultWidth * this.scale <= this.width) 
            {
                maxTransX = (this.width - this.defaultWidth * this.scale) / (2 * this.scale);
                minTransX = (this.width - this.defaultWidth * this.scale) / (2 * this.scale);
            } 
            else 
            {
                maxTransX = 0;
                minTransX = (this.width - this.defaultWidth * this.scale) / this.scale;
            }
            
            if (this.defaultHeight * this.scale <= this.height) 
            {
                maxTransY = (this.height - this.defaultHeight * this.scale) / (2 * this.scale);
                minTransY = (this.height - this.defaultHeight * this.scale) / (2 * this.scale);
            } 
            else 
            {
                maxTransY = 0;
                minTransY = (this.height - this.defaultHeight * this.scale) / this.scale;
            }
            
            if (this.transY > maxTransY) 
            {
                this.transY = maxTransY;
            } 
            else if (this.transY < minTransY) 
            {
                this.transY = minTransY;
            }
            if (this.transX > maxTransX) 
            {
                this.transX = maxTransX;
            } 
            else if (this.transX < minTransX) 
            {
                this.transX = minTransX;
            }            
            this.canvas.applyTransformParams(this.scale, this.transX, this.transY);
        },
        
        makeDraggable: function()
        {
            var mouseDown = false;
            var oldPageX, oldPageY;
            var self = this;

            //mouse move on <body>
            this.container.mousedown(function(e)
            {
                mouseDown = true;
                oldPageX = e.pageX;
                oldPageY = e.pageY;
                return false;
            });
            $(this.container).closest('body').mousemove(function(e)
            {
                if (mouseDown) 
                {
                    $(self.container).addClass('grabbing');
                    var curTransX = self.transX;
                    var curTransY = self.transY;
                    
                    self.transX -= (oldPageX - e.pageX) / self.scale;
                    self.transY -= (oldPageY - e.pageY) / self.scale;
                    
                    self.applyTransform();
                    
                    oldPageX = e.pageX;
                    oldPageY = e.pageY;                    
                }
                return false;
            }).mouseup(function()
            {
                mouseDown = false;
                $(self.container).removeClass('grabbing');
                return false;
            });    
        },

        zoomIn : function() 
        {
            if (this.zoomCurStep < this.zoomMaxStep) 
            {
                var curTransX = this.transX;
                var curTransY = this.transY;
                var curScale = this.scale;
                this.transX -= (this.width / this.scale - this.width / (this.scale * this.zoomStep)) / 2;
                this.transY -= (this.height / this.scale - this.height / (this.scale * this.zoomStep)) / 2;
                this.setScale(this.scale * this.zoomStep);
                this.zoomCurStep++;
                this.setStrokeWidth(this.calcStrokeWidth(this.zoomCurStep));
                $(this.container).trigger('zoomin', [this]);
            }
        },

        zoomOut : function() 
        {
            if (this.zoomCurStep > 1) 
            {
                var curTransX = this.transX;
                var curTransY = this.transY;
                var curScale = this.scale;
                this.transX += (this.width / (this.scale / this.zoomStep) - this.width / this.scale) / 2;
                this.transY += (this.height / (this.scale / this.zoomStep) - this.height / this.scale) / 2;
                this.setScale(this.scale / this.zoomStep);
                this.zoomCurStep--;
                this.setStrokeWidth(this.calcStrokeWidth(this.zoomCurStep));
                $(this.container).trigger('zoomout', [this]);
            }
        },

        calcStrokeWidth: function(zoom)
        {
            return Math.max(0.1, this.style.strokeWidth - (zoom-1)*0.1);
        },
        
        bindZoomButtons: function() 
        {
            var map = this;
            this.container.find('.jvectormap-zoomin').click(function(){map.zoomIn()});
            this.container.find('.jvectormap-zoomout').click(function(){map.zoomOut()});
            this.container.dblclick(function(){map.zoomIn()});
        },
        
        setScale: function(scale) 
        {
            this.scale = scale;
            this.applyTransform();
        }
    }	
	WorldMap.xlink = "http://www.w3.org/1999/xlink";
	WorldMap.mapIndex = 1;
    WorldMap.maps = {};
})( jQuery );
