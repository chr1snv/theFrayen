//frayen vert shader


void main()
{
	gl_FrontColor = gl_Color;
	gl_TexCoord[0] = glMultiTexCoord0;
	gl_Position = ftransform;
}
